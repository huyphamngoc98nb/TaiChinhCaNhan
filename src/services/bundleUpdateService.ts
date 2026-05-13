import { registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { getDbConnection } from '@/core/db/sqlite/connection';
import type { BundleApplyResult } from '@/types/update';

const ACTIVE_BUNDLE_PATH_KEY = 'activeBundlePath';
const ACTIVE_BUNDLE_VERSION_KEY = 'activeBundleVersion';
const LAST_GOOD_BUNDLE_PATH_KEY = 'lastGoodBundlePath';
const OFFSET_FLUSH_BYTES = 1024 * 1024;

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs0N1nYQ8n8qjK9cSsp3X
UfQ7D7x42m9VQmJ1R79VTxDg3Vf50gklxW8O5rTtfVzvA0mDqYhCYW8Lx7aSxqGX
b2R7Axt9Gi2nV4W9mJq9V6J4b9a3w1gI0SX7Y/AA8sZSqhT+xeq3pFzNQqKXk9xN
wRiw1Z8lXxA4o2DTRzC5bri8O/8Uu7OyN2Jgdw0AONzGZoF1uWZbJYzKCHgKk8nF
1g/nnB8Tq1g0MZpR08BLe5b5sG8mTRhOblXo9sJ7+2GmGkBkb6vLdyU2aWqGOa0z
awjU4J6dB9gGMzH4mQ7QCL5A1q2fp9C2WQIDAQAB
-----END PUBLIC KEY-----`;

interface BundleUpdateInput {
  bundleVersion: string;
  zipUrl: string;
  sha256: string;
  sigBase64: string;
}

interface ConfigRow {
  value?: unknown;
}

interface ToastPlugin {
  show(options: {
    text: string;
    duration?: 'short' | 'long';
    position?: 'top' | 'center' | 'bottom';
  }): Promise<void>;
}

const Toast = registerPlugin<ToastPlugin>('Toast');

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

function getZipPath(bundleVersion: string): string {
  return `bundles/${bundleVersion}.zip`;
}

function getBundlePath(bundleVersion: string): string {
  return `bundles/${bundleVersion}`;
}

function getOffsetKey(bundleVersion: string): string {
  return `download_offset_${bundleVersion}`;
}

function makeResult(
  bundleVersion: string,
  status: BundleApplyResult['status'],
  success: boolean,
  startMs: number,
): BundleApplyResult {
  const durationMs = Date.now() - startMs;
  const result = { success, bundleVersion, status, durationMs };
  const message = `[BundleUpdateService] status=${status} version=${bundleVersion} duration=${durationMs}ms`;

  if (success) {
    console.info(message);
  } else {
    console.error(message);
  }

  return result;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');

  return bytesToArrayBuffer(base64ToBytes(base64));
}

async function safeDeleteFile(path: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  } catch {
    // Missing files are acceptable during cleanup.
  }
}

async function getExistingZipSize(path: string): Promise<number> {
  try {
    const stat = await Filesystem.stat({ path, directory: Directory.Data });
    return stat.type === 'file' ? stat.size : 0;
  } catch {
    return 0;
  }
}

async function downloadZip(updateData: BundleUpdateInput, zipPath: string): Promise<boolean> {
  const offsetKey = getOffsetKey(updateData.bundleVersion);
  const storedOffset = Number(await getConfig(offsetKey));
  const existingSize = await getExistingZipSize(zipPath);
  const resumeOffset = Number.isFinite(storedOffset) && storedOffset > 0 && existingSize >= storedOffset
    ? storedOffset
    : 0;

  const headers = new Headers();
  if (resumeOffset > 0) {
    headers.set('Range', `bytes=${resumeOffset}-`);
  }

  const response = await fetch(updateData.zipUrl, { headers });
  if (!response.ok && response.status !== 206) {
    return false;
  }

  const shouldAppend = resumeOffset > 0 && response.status === 206;
  if (!shouldAppend) {
    await safeDeleteFile(zipPath);
    await deleteConfig(offsetKey);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    await Filesystem.writeFile({
      path: zipPath,
      data: bytesToBase64(buffer),
      directory: Directory.Data,
      recursive: true,
    });
    await deleteConfig(offsetKey);
    return true;
  }

  let downloadedBytes = shouldAppend ? resumeOffset : 0;
  let lastFlushedOffset = downloadedBytes;
  let firstChunk = true;

  while (true) {
    const read = await reader.read();
    if (read.done) {
      break;
    }

    const chunk = read.value;
    if (firstChunk && !shouldAppend) {
      await Filesystem.writeFile({
        path: zipPath,
        data: bytesToBase64(chunk),
        directory: Directory.Data,
        recursive: true,
      });
      firstChunk = false;
    } else {
      await Filesystem.appendFile({
        path: zipPath,
        data: bytesToBase64(chunk),
        directory: Directory.Data,
      });
    }

    downloadedBytes += chunk.byteLength;
    if (downloadedBytes - lastFlushedOffset >= OFFSET_FLUSH_BYTES) {
      await setConfig(offsetKey, String(downloadedBytes));
      lastFlushedOffset = downloadedBytes;
    }
  }

  await deleteConfig(offsetKey);
  return true;
}

async function readZipBytes(zipPath: string): Promise<Uint8Array> {
  const file = await Filesystem.readFile({ path: zipPath, directory: Directory.Data });
  if (file.data instanceof Blob) {
    return new Uint8Array(await file.data.arrayBuffer());
  }

  return base64ToBytes(file.data);
}

async function verifySha256(zipBytes: Uint8Array, expectedSha256: string): Promise<boolean> {
  const digest = await crypto.subtle.digest('SHA-256', bytesToArrayBuffer(zipBytes));
  return arrayBufferToHex(digest).toLowerCase() === expectedSha256.trim().toLowerCase();
}

async function verifySignature(zipBytes: Uint8Array, sigBase64: string): Promise<boolean> {
  const publicKey = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(PUBLIC_KEY_PEM),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify'],
  );

  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    bytesToArrayBuffer(base64ToBytes(sigBase64)),
    bytesToArrayBuffer(zipBytes),
  );
}

async function extractBundle(bundleVersion: string): Promise<boolean> {
  try {
    await Filesystem.mkdir({
      path: getBundlePath(bundleVersion),
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    // Existing destination directory is acceptable for this mocked extractor.
  }

  // TODO: Replace this mocked extractor with a Capacitor unzip plugin when one is added to package.json.
  console.warn('[BundleUpdateService] unzip plugin unavailable; skipping real extraction');
  return true;
}

async function activateBundle(bundleVersion: string): Promise<void> {
  const previousActivePath = await getConfig(ACTIVE_BUNDLE_PATH_KEY);
  const nextActivePath = getBundlePath(bundleVersion);

  await setConfig(ACTIVE_BUNDLE_PATH_KEY, nextActivePath);
  await setConfig(ACTIVE_BUNDLE_VERSION_KEY, bundleVersion);

  if (previousActivePath) {
    await setConfig(LAST_GOOD_BUNDLE_PATH_KEY, previousActivePath);
  }
}

async function showReadyToast(): Promise<void> {
  try {
    await Toast.show({
      text: 'Cập nhật sẵn sàng — Khởi động lại để áp dụng?',
      duration: 'long',
      position: 'bottom',
    });
  } catch {
    // Toast is best-effort because @capacitor/toast is not currently in package.json.
  }
}

export async function applyBundleUpdate(updateData: BundleUpdateInput): Promise<BundleApplyResult> {
  const startMs = Date.now();
  const zipPath = getZipPath(updateData.bundleVersion);

  try {
    const activeBundleVersion = await getConfig(ACTIVE_BUNDLE_VERSION_KEY);
    if (activeBundleVersion === updateData.bundleVersion) {
      return makeResult(updateData.bundleVersion, 'already_active', true, startMs);
    }
  } catch {
    return makeResult(updateData.bundleVersion, 'download_error', false, startMs);
  }

  try {
    const downloaded = await downloadZip(updateData, zipPath);
    if (!downloaded) {
      return makeResult(updateData.bundleVersion, 'download_error', false, startMs);
    }
  } catch {
    return makeResult(updateData.bundleVersion, 'download_error', false, startMs);
  }

  let zipBytes: Uint8Array;
  try {
    zipBytes = await readZipBytes(zipPath);
    const sha256Valid = await verifySha256(zipBytes, updateData.sha256);
    if (!sha256Valid) {
      await safeDeleteFile(zipPath);
      return makeResult(updateData.bundleVersion, 'sha256_mismatch', false, startMs);
    }
  } catch {
    await safeDeleteFile(zipPath);
    return makeResult(updateData.bundleVersion, 'sha256_mismatch', false, startMs);
  }

  try {
    const signatureValid = await verifySignature(zipBytes, updateData.sigBase64);
    if (!signatureValid) {
      await safeDeleteFile(zipPath);
      return makeResult(updateData.bundleVersion, 'signature_invalid', false, startMs);
    }
  } catch {
    await safeDeleteFile(zipPath);
    return makeResult(updateData.bundleVersion, 'signature_invalid', false, startMs);
  }

  try {
    const extracted = await extractBundle(updateData.bundleVersion);
    if (!extracted) {
      return makeResult(updateData.bundleVersion, 'extract_error', false, startMs);
    }
  } catch {
    return makeResult(updateData.bundleVersion, 'extract_error', false, startMs);
  }

  try {
    await activateBundle(updateData.bundleVersion);
    await showReadyToast();
    return makeResult(updateData.bundleVersion, 'applied', true, startMs);
  } catch {
    return makeResult(updateData.bundleVersion, 'extract_error', false, startMs);
  }
}

export async function runHealthcheck(): Promise<'pass' | 'fail'> {
  await new Promise(resolve => {
    window.setTimeout(resolve, 5000);
  });

  if (document.readyState !== 'complete') {
    return 'fail';
  }

  try {
    const activeBundlePath = await getConfig(ACTIVE_BUNDLE_PATH_KEY);
    if (activeBundlePath) {
      await setConfig(LAST_GOOD_BUNDLE_PATH_KEY, activeBundlePath);
    }
  } catch {
    return 'fail';
  }

  return 'pass';
}
