import { Directory, Filesystem } from '@capacitor/filesystem';
import { getDbConnection } from '@/core/db/sqlite/connection';

const PROGRESS_KEY = 'apkDownloadProgress';
const URL_KEY = 'apkDownloadUrl';
const APK_PATH = 'updates/app-update.apk';
const OFFSET_FLUSH_BYTES = 1024 * 1024;

export type ApkDownloadStatus = 'idle' | 'downloading' | 'completed' | 'error' | 'cancelled';

export interface ApkDownloadState {
  status: ApkDownloadStatus;
  apkUrl: string | null;
  downloadedBytes: number;
  totalBytes: number | null;
  bytesPerSecond: number;
  mandatory: boolean;
  filePath: string | null;
  error: string | null;
}

export interface ApkDownloadInput {
  apkUrl: string;
  mandatory?: boolean;
  signal?: AbortSignal;
}

export interface ApkDownloadResult {
  filePath: string;
  downloadedBytes: number;
  totalBytes: number | null;
}

interface ConfigRow {
  value?: unknown;
}

type Listener = (state: ApkDownloadState) => void;

const initialState: ApkDownloadState = {
  status: 'idle',
  apkUrl: null,
  downloadedBytes: 0,
  totalBytes: null,
  bytesPerSecond: 0,
  mandatory: false,
  filePath: null,
  error: null,
};

const listeners = new Set<Listener>();
let state = initialState;
let activeDownload: Promise<ApkDownloadResult> | null = null;
let activeAbortController: AbortController | null = null;

function emit(nextState: ApkDownloadState): void {
  state = nextState;
  listeners.forEach(listener => listener(state));
}

function patchState(patch: Partial<ApkDownloadState>): void {
  emit({ ...state, ...patch });
}

async function ensureAppConfigTable(): Promise<void> {
  const db = await getDbConnection();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

async function getConfig(key: string): Promise<string | null> {
  await ensureAppConfigTable();

  const db = await getDbConnection();
  const result = await db.query('SELECT value FROM app_config WHERE key = ?', [key]);
  const row = result.values?.[0] as ConfigRow | undefined;

  return typeof row?.value === 'string' ? row.value : null;
}

async function setConfig(key: string, value: string): Promise<void> {
  await ensureAppConfigTable();

  const db = await getDbConnection();
  await db.run('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)', [key, value]);
}

async function deleteConfig(key: string): Promise<void> {
  await ensureAppConfigTable();

  const db = await getDbConnection();
  await db.run('DELETE FROM app_config WHERE key = ?', [key]);
}

function assertSecureApkUrl(apkUrl: string): void {
  const url = new URL(apkUrl);
  if (url.protocol !== 'https:') {
    throw new Error('APK download URL must use HTTPS');
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function parseContentLength(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const length = Number(value);
  return Number.isFinite(length) && length >= 0 ? length : null;
}

function parseTotalBytes(response: Response, resumeOffset: number): number | null {
  const range = response.headers.get('Content-Range');
  const rangeTotal = range?.match(/\/(\d+)$/)?.[1];
  if (rangeTotal) {
    return Number(rangeTotal);
  }

  const contentLength = parseContentLength(response.headers.get('Content-Length'));
  return contentLength === null ? null : contentLength + resumeOffset;
}

async function safeDeleteApk(): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: APK_PATH, directory: Directory.Data });
  } catch {
    // Missing partial APK is fine during cleanup.
  }
}

async function clearStoredProgress(): Promise<void> {
  await deleteConfig(PROGRESS_KEY);
  await deleteConfig(URL_KEY);
}

async function getResumeOffset(apkUrl: string): Promise<number> {
  const storedUrl = await getConfig(URL_KEY);
  if (storedUrl && storedUrl !== apkUrl) {
    await safeDeleteApk();
    await clearStoredProgress();
    return 0;
  }

  const storedProgress = Number(await getConfig(PROGRESS_KEY));
  return Number.isFinite(storedProgress) && storedProgress > 0 ? storedProgress : 0;
}

async function resolveApkFilePath(): Promise<string> {
  if ('getUri' in Filesystem && typeof Filesystem.getUri === 'function') {
    const result = await Filesystem.getUri({ path: APK_PATH, directory: Directory.Data });
    return result.uri;
  }

  return APK_PATH;
}

async function persistProgress(downloadedBytes: number): Promise<void> {
  await setConfig(PROGRESS_KEY, String(downloadedBytes));
  await setConfig(URL_KEY, state.apkUrl ?? '');
}

async function download(input: ApkDownloadInput, abortController: AbortController): Promise<ApkDownloadResult> {
  assertSecureApkUrl(input.apkUrl);

  const resumeOffset = await getResumeOffset(input.apkUrl);
  const headers = new Headers();
  if (resumeOffset > 0) {
    headers.set('Range', `bytes=${resumeOffset}-`);
  }

  await setConfig(URL_KEY, input.apkUrl);

  patchState({
    status: 'downloading',
    apkUrl: input.apkUrl,
    downloadedBytes: resumeOffset,
    totalBytes: null,
    bytesPerSecond: 0,
    mandatory: Boolean(input.mandatory),
    filePath: null,
    error: null,
  });

  const response = await fetch(input.apkUrl, { headers, signal: abortController.signal });
  if (!response.ok && response.status !== 206) {
    throw new Error('APK download failed');
  }

  const shouldAppend = resumeOffset > 0 && response.status === 206;
  if (!shouldAppend) {
    await safeDeleteApk();
    await deleteConfig(PROGRESS_KEY);
  }

  const totalBytes = parseTotalBytes(response, shouldAppend ? resumeOffset : 0);
  let downloadedBytes = shouldAppend ? resumeOffset : 0;
  let lastFlushedOffset = downloadedBytes;
  let firstChunk = true;
  let sampleStartedAt = performance.now();
  let sampleBytes = 0;

  patchState({ totalBytes, downloadedBytes });

  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    await Filesystem.writeFile({
      path: APK_PATH,
      data: bytesToBase64(buffer),
      directory: Directory.Data,
      recursive: true,
    });
    downloadedBytes += buffer.byteLength;
    const filePath = await resolveApkFilePath();
    await clearStoredProgress();
    patchState({ status: 'completed', downloadedBytes, totalBytes, bytesPerSecond: 0, filePath });
    return { filePath, downloadedBytes, totalBytes };
  }

  try {
    let read = await reader.read();
    while (!read.done) {
      const chunk = read.value;
      if (firstChunk && !shouldAppend) {
        await Filesystem.writeFile({
          path: APK_PATH,
          data: bytesToBase64(chunk),
          directory: Directory.Data,
          recursive: true,
        });
        firstChunk = false;
      } else {
        await Filesystem.appendFile({
          path: APK_PATH,
          data: bytesToBase64(chunk),
          directory: Directory.Data,
        });
      }

      downloadedBytes += chunk.byteLength;
      sampleBytes += chunk.byteLength;

      const now = performance.now();
      const elapsedSeconds = Math.max((now - sampleStartedAt) / 1000, 0.001);
      const bytesPerSecond = sampleBytes / elapsedSeconds;

      patchState({ downloadedBytes, totalBytes, bytesPerSecond });

      if (downloadedBytes - lastFlushedOffset >= OFFSET_FLUSH_BYTES) {
        await persistProgress(downloadedBytes);
        lastFlushedOffset = downloadedBytes;
      }

      if (elapsedSeconds >= 1) {
        sampleStartedAt = now;
        sampleBytes = 0;
      }

      read = await reader.read();
    }
  } catch (error) {
    await persistProgress(downloadedBytes);
    patchState({
      status: abortController.signal.aborted ? 'cancelled' : 'error',
      downloadedBytes,
      error: error instanceof Error ? error.message : 'APK download interrupted',
    });
    throw error;
  }

  const filePath = await resolveApkFilePath();
  await clearStoredProgress();
  patchState({ status: 'completed', downloadedBytes, totalBytes, bytesPerSecond: 0, filePath });

  return { filePath, downloadedBytes, totalBytes };
}

export function subscribeToApkDownload(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);

  return () => {
    listeners.delete(listener);
  };
}

export function getApkDownloadState(): ApkDownloadState {
  return state;
}

export function startApkDownload(input: ApkDownloadInput): Promise<ApkDownloadResult> {
  if (activeDownload && state.apkUrl === input.apkUrl) {
    return activeDownload;
  }

  activeAbortController = new AbortController();
  if (input.signal) {
    input.signal.addEventListener('abort', () => activeAbortController?.abort(), { once: true });
  }

  activeDownload = download(input, activeAbortController).finally(() => {
    activeDownload = null;
    activeAbortController = null;
  });

  return activeDownload;
}

export async function cancelApkDownload(): Promise<void> {
  activeAbortController?.abort();
  await clearStoredProgress();
  await safeDeleteApk();
  patchState({ ...initialState, status: 'cancelled' });
}

export const apkDownloadService = {
  cancel: cancelApkDownload,
  getState: getApkDownloadState,
  start: startApkDownload,
  subscribe: subscribeToApkDownload,
};
