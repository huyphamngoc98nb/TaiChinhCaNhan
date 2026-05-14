import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { getDbConnection } from '@/core/db/sqlite/connection';
import { startApkDownload } from '@/services/apkDownloadService';

const mockStore: Record<string, string> = {};

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  getDbConnection: vi.fn(),
  writeFile: vi.fn(),
  appendFile: vi.fn(),
  deleteFile: vi.fn(),
  getUri: vi.fn(),
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: mocks.writeFile,
    appendFile: mocks.appendFile,
    deleteFile: mocks.deleteFile,
    getUri: mocks.getUri,
  },
  Directory: { Data: 'DATA' },
}));

vi.mock('@/core/db/sqlite/connection', () => ({
  DB_NAME: 'taixiu_db',
  getDbConnection: mocks.getDbConnection,
}));

interface QueryResult {
  values: Array<{ value: string }>;
}

interface MockDb {
  execute: ReturnType<typeof vi.fn<() => Promise<void>>>;
  query: ReturnType<typeof vi.fn<(sql: string, params?: unknown[]) => Promise<QueryResult>>>;
  run: ReturnType<typeof vi.fn<(sql: string, params?: unknown[]) => Promise<void>>>;
}

type DbConnection = Awaited<ReturnType<typeof getDbConnection>>;

function createMockDb(): MockDb {
  return {
    execute: vi.fn(async () => undefined),
    query: vi.fn(async (_sql: string, params?: unknown[]) => {
      const key = typeof params?.[0] === 'string' ? params[0] : '';
      const value = mockStore[key];
      return { values: value === undefined ? [] : [{ value }] };
    }),
    run: vi.fn(async (sql: string, params?: unknown[]) => {
      const key = typeof params?.[0] === 'string' ? params[0] : '';

      if (sql.startsWith('INSERT OR REPLACE')) {
        mockStore[key] = typeof params?.[1] === 'string' ? params[1] : '';
      }

      if (sql.startsWith('DELETE')) {
        delete mockStore[key];
      }
    }),
  };
}

function makeChunk(size: number): Uint8Array {
  return new Uint8Array(size).fill(1);
}

function makeStream(chunks: Uint8Array[], errorAfterChunks = false): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(chunks[index]);
        index += 1;
        return;
      }

      if (errorAfterChunks) {
        controller.error(new Error('network interrupted'));
        return;
      }

      controller.close();
    },
  });
}

function makeDownloadResponse(
  chunks: Uint8Array[],
  headers: Record<string, string> = {},
  status = 200,
  errorAfterChunks = false,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    body: makeStream(chunks, errorAfterChunks),
    arrayBuffer: vi.fn(),
  } as unknown as Response;
}

describe('apkDownloadService', () => {
  let db: MockDb;

  beforeEach(() => {
    Object.keys(mockStore).forEach(key => {
      delete mockStore[key];
    });
    vi.clearAllMocks();

    globalThis.fetch = mocks.fetch as unknown as typeof fetch;
    db = createMockDb();
    vi.mocked(getDbConnection).mockResolvedValue(db as unknown as DbConnection);
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'mock-write-uri' });
    vi.mocked(Filesystem.appendFile).mockResolvedValue(undefined);
    vi.mocked(Filesystem.deleteFile).mockResolvedValue(undefined);
    vi.mocked(Filesystem.getUri).mockResolvedValue({ uri: 'file:///data/update.apk' });
  });

  it('should download APK and save progress every 1MB', async () => {
    const chunks = [makeChunk(512 * 1024), makeChunk(512 * 1024), makeChunk(512 * 1024)];
    mocks.fetch.mockResolvedValueOnce(makeDownloadResponse(chunks, { 'Content-Length': String(1536 * 1024) }));

    const result = await startApkDownload({ apkUrl: 'https://cdn.example.com/app.apk' });

    expect(result.downloadedBytes).toBe(1536 * 1024);
    expect(Filesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      path: 'updates/app-update.apk',
      directory: Directory.Data,
      recursive: true,
    }));
    expect(Filesystem.appendFile).toHaveBeenCalledTimes(2);
    expect(db.run).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
      ['apkDownloadProgress', String(1024 * 1024)],
    );
  });

  it('should send Range header when downloadedBytes > 0 in SQLite', async () => {
    mockStore.apkDownloadUrl = 'https://cdn.example.com/app.apk';
    mockStore.apkDownloadProgress = String(1024 * 1024);
    mocks.fetch.mockResolvedValueOnce(makeDownloadResponse(
      [makeChunk(256 * 1024)],
      { 'Content-Range': `bytes 1048576-1310719/${1280 * 1024}` },
      206,
    ));

    await startApkDownload({ apkUrl: 'https://cdn.example.com/app.apk' });

    const init = mocks.fetch.mock.calls[0][1] as RequestInit;
    expect((init.headers as Headers).get('Range')).toBe('bytes=1048576-');
  });

  it('should hide dismiss button when mandatory=true', async () => {
    mocks.fetch.mockResolvedValueOnce(makeDownloadResponse([makeChunk(128)], { 'Content-Length': '128' }));

    await startApkDownload({ apkUrl: 'https://cdn.example.com/force.apk', mandatory: true });

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mockStore.apkDownloadProgress).toBeUndefined();
  });

  it('should show dismiss button when mandatory=false', async () => {
    mocks.fetch.mockResolvedValueOnce(makeDownloadResponse([makeChunk(128)], { 'Content-Length': '128' }));

    await startApkDownload({ apkUrl: 'https://cdn.example.com/optional.apk', mandatory: false });

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mockStore.apkDownloadProgress).toBeUndefined();
  });

  it('should persist downloadedBytes to SQLite on network interruption', async () => {
    mocks.fetch.mockResolvedValueOnce(makeDownloadResponse(
      [makeChunk(1024 * 1024)],
      { 'Content-Length': String(2 * 1024 * 1024) },
      200,
      true,
    ));

    await expect(startApkDownload({ apkUrl: 'https://cdn.example.com/app.apk' })).rejects.toThrow('network interrupted');

    expect(mockStore.apkDownloadProgress).toBe(String(1024 * 1024));
  });

  it('should clear apkDownloadProgress from SQLite after successful download', async () => {
    mockStore.apkDownloadProgress = String(1024 * 1024);
    mockStore.apkDownloadUrl = 'https://cdn.example.com/app.apk';
    mocks.fetch.mockResolvedValueOnce(makeDownloadResponse([makeChunk(128)], {}, 206));

    await startApkDownload({ apkUrl: 'https://cdn.example.com/app.apk' });

    expect(mockStore.apkDownloadProgress).toBeUndefined();
    expect(mockStore.apkDownloadUrl).toBeUndefined();
    expect(db.run).toHaveBeenCalledWith('DELETE FROM app_config WHERE key = ?', ['apkDownloadProgress']);
  });
});
