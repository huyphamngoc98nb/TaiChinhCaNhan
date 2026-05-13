import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { App } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import { updateCoordinator } from '@/services/updateCoordinator';
import { applyBundleUpdate, runHealthcheck } from '@/services/bundleUpdateService';
import { promoteBundle, rollback } from '@/services/rollbackService';
import { getDbConnection } from '@/core/db/sqlite/connection';

const mockStore: Record<string, string> = {};

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  getDbConnection: vi.fn(),
  writeFile: vi.fn(),
  appendFile: vi.fn(),
  readFile: vi.fn(),
  deleteFile: vi.fn(),
  rmdir: vi.fn(),
  mkdir: vi.fn(),
  stat: vi.fn(),
  toastShow: vi.fn(),
  appGetInfo: vi.fn(),
  registerPlugin: vi.fn(),
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: mocks.writeFile,
    appendFile: mocks.appendFile,
    readFile: mocks.readFile,
    deleteFile: mocks.deleteFile,
    rmdir: mocks.rmdir,
    mkdir: mocks.mkdir,
    stat: mocks.stat,
  },
  Directory: { Data: 'DATA' },
}));

vi.mock('@capacitor/toast', () => ({
  Toast: { show: mocks.toastShow },
}));

vi.mock('@capacitor/app', () => ({
  App: { getInfo: mocks.appGetInfo },
}));

vi.mock('@capacitor/core', () => ({
  registerPlugin: mocks.registerPlugin.mockReturnValue({ show: mocks.toastShow }),
}));

vi.mock('@/core/db/sqlite/connection', () => ({
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

function makeArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function makeMatchingSha256Buffer(): ArrayBuffer {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i += 4) {
    bytes[i] = 0xde;
    bytes[i + 1] = 0xad;
    bytes[i + 2] = 0xbe;
    bytes[i + 3] = 0xef;
  }
  return makeArrayBuffer(bytes);
}

function makeFakeZipBase64(): string {
  return btoa(String.fromCharCode(...new Uint8Array(512).fill(1)));
}

function mockBundleApiResponse(overrides: Record<string, unknown> = {}) {
  return {
    hasUpdate: true,
    nativeRequired: null,
    update: {
      bundleVersion: '0.1.0-b3',
      zipUrl: 'https://cdn.example.com/bundles/0.1.0-b3.zip',
      sha256: 'deadbeef'.repeat(8),
      sigBase64: 'ZmFrZXNpZw==',
    },
    ...overrides,
  };
}

function makeApiResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: vi.fn(async () => data),
  };
}

function makeDownloadResponse() {
  return {
    ok: true,
    status: 200,
    body: undefined,
    arrayBuffer: vi.fn(async () => makeArrayBuffer(new Uint8Array(512).fill(1))),
  };
}

function setReadyState(value: DocumentReadyState): void {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    value,
  });
}

function getFetchMock(): Mock {
  return globalThis.fetch as unknown as Mock;
}

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

describe('OTA Sprint 1 integration flow', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(key => {
      delete mockStore[key];
    });
    vi.clearAllMocks();
    vi.useRealTimers();
    setReadyState('complete');

    globalThis.fetch = mocks.fetch as unknown as typeof fetch;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        subtle: {
          digest: vi.fn(async () => makeMatchingSha256Buffer()),
          importKey: vi.fn(async () => ({})),
          verify: vi.fn(async () => true),
        },
      },
    });

    vi.mocked(registerPlugin).mockReturnValue({ show: mocks.toastShow });
    vi.mocked(App.getInfo).mockResolvedValue({ version: '0.1.0', build: '100', name: 'TaiXiuCaNhan', id: 'app.test' });
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'bundles/0.1.0-b3.zip' });
    vi.mocked(Filesystem.appendFile).mockResolvedValue(undefined);
    vi.mocked(Filesystem.readFile).mockResolvedValue({ data: makeFakeZipBase64() });
    vi.mocked(Filesystem.deleteFile).mockResolvedValue(undefined);
    vi.mocked(Filesystem.rmdir).mockResolvedValue(undefined);
    vi.mocked(Filesystem.mkdir).mockResolvedValue(undefined);
    vi.mocked(Filesystem.stat).mockResolvedValue({
      type: 'file',
      size: 0,
      mtime: Date.now(),
      uri: 'mock-uri',
    });
    mocks.toastShow.mockResolvedValue({});
    vi.mocked(getDbConnection).mockResolvedValue(createMockDb() as unknown as DbConnection);
  });

  it('TC-01 Happy path: download -> verify -> apply -> healthcheck pass', async () => {
    mockStore.lastCheckAt = String(Date.now() - 25 * 3600 * 1000);
    getFetchMock()
      .mockResolvedValueOnce(makeApiResponse(mockBundleApiResponse()))
      .mockResolvedValueOnce(makeDownloadResponse());
    vi.useFakeTimers();

    const resultPromise = updateCoordinator.checkAndUpdate();
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.strategy).toBe('B');
    expect(result.status).toBe('bundle_available');
    expect(Filesystem.writeFile).toHaveBeenCalled();
    expect(Filesystem.rmdir).not.toHaveBeenCalled();
    expect(mockStore.activeBundleVersion).toBe('0.1.0-b3');
    expect(mockStore.lastGoodBundlePath).toBe('bundles/0.1.0-b3');
    expect(mocks.toastShow).toHaveBeenCalledTimes(1);
  });

  it('TC-02 SHA-256 mismatch: file is deleted and bundle is not applied', async () => {
    const update = mockBundleApiResponse().update as {
      bundleVersion: string;
      zipUrl: string;
      sha256: string;
      sigBase64: string;
    };
    getFetchMock().mockResolvedValueOnce(makeDownloadResponse());
    (crypto.subtle.digest as Mock).mockResolvedValue(makeArrayBuffer(new Uint8Array(32).fill(0xff)));

    const result = await applyBundleUpdate(update);

    expect(result.success).toBe(false);
    expect(result.status).toBe('sha256_mismatch');
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path: expect.stringContaining('bundles/'),
      directory: Directory.Data,
    });
    expect(Filesystem.rmdir).not.toHaveBeenCalled();
    expect(mockStore.activeBundlePath).toBeUndefined();
    expect(mocks.toastShow).not.toHaveBeenCalled();
  });

  it('TC-03 Healthcheck fail -> rollback automatically restores lastGoodBundlePath', async () => {
    const update = mockBundleApiResponse().update as {
      bundleVersion: string;
      zipUrl: string;
      sha256: string;
      sigBase64: string;
    };
    mockStore.lastGoodBundlePath = 'bundles/0.1.0-b2';
    mockStore.activeBundlePath = 'bundles/0.1.0-b2';
    getFetchMock().mockResolvedValueOnce(makeDownloadResponse());

    const applyResult = await applyBundleUpdate(update);
    expect(applyResult.success).toBe(true);

    setReadyState('loading');
    vi.useFakeTimers();
    const healthPromise = runHealthcheck();
    await vi.advanceTimersByTimeAsync(5000);
    const health = await healthPromise;
    if (health === 'fail') {
      await rollback();
    }

    expect(health).toBe('fail');
    expect(mockStore.activeBundlePath).toBe('bundles/0.1.0-b2');
    expect(Filesystem.rmdir).toHaveBeenCalledWith({
      path: 'bundles/0.1.0-b3',
      directory: Directory.Data,
      recursive: true,
    });
    expect(mockStore.rollbackCount).toBe('1');
    expect(mockStore.lastGoodBundlePath).toBe('');
  });

  it('TC-04 Resume download: sends Range header from saved offset', async () => {
    const update = mockBundleApiResponse().update as {
      bundleVersion: string;
      zipUrl: string;
      sha256: string;
      sigBase64: string;
    };
    mockStore['download_offset_0.1.0-b3'] = '1048576';
    vi.mocked(Filesystem.stat).mockResolvedValue({
      type: 'file',
      size: 1048576,
      mtime: Date.now(),
      uri: 'mock-uri',
    });
    getFetchMock().mockResolvedValueOnce(makeDownloadResponse());

    await applyBundleUpdate(update);

    const requestInit = getFetchMock().mock.calls[0][1] as { headers?: Headers };
    expect(requestInit.headers?.get('Range')).toBe('bytes=1048576-');
    expect(mockStore['download_offset_0.1.0-b3']).toBeUndefined();
  });

  it('TC-05 nativeRequired: does not download bundle and returns strategy A', async () => {
    mockStore.lastCheckAt = String(Date.now() - 25 * 3600 * 1000);
    getFetchMock().mockResolvedValueOnce(makeApiResponse({
      hasUpdate: false,
      nativeRequired: {
        minNativeVersion: '0.2.0',
        downloadUrl: 'https://cdn.example.com/apk/0.2.0.apk',
        mandatory: true,
      },
      update: null,
    }));

    const result = await updateCoordinator.checkAndUpdate();

    expect(result.strategy).toBe('A');
    expect(result.status).toBe('native_required');
    expect(Filesystem.writeFile).not.toHaveBeenCalled();
    expect(Filesystem.rmdir).not.toHaveBeenCalled();
    expect(mocks.toastShow).not.toHaveBeenCalled();
    expect(mockStore.activeBundlePath).toBeUndefined();
  });

  it('TC-06 Throttle: second check within 24h does not call fetch again', async () => {
    mockStore.lastCheckAt = String(Date.now() - 25 * 3600 * 1000);
    getFetchMock().mockResolvedValueOnce(makeApiResponse({
      hasUpdate: false,
      nativeRequired: null,
      update: null,
    }));

    const first = await updateCoordinator.checkAndUpdate();
    const second = await updateCoordinator.checkAndUpdate();

    expect(first.status).toBe('up_to_date');
    expect(second).toEqual({ strategy: 'none', status: 'throttled' });
    expect(getFetchMock()).toHaveBeenCalledTimes(1);
  });

  it('TC-07 API error: returns api_error without crashing', async () => {
    mockStore.lastCheckAt = String(Date.now() - 25 * 3600 * 1000);
    getFetchMock().mockRejectedValueOnce(new Error('network error'));

    const result = await updateCoordinator.checkAndUpdate();

    expect(result).toEqual({ strategy: 'none', status: 'api_error' });
  });

  it('TC-08 promoteBundle keeps at most two bundles', async () => {
    mockStore.activeBundlePath = 'bundles/0.1.0-b2';
    mockStore.lastGoodBundlePath = 'bundles/0.1.0-b1';

    await promoteBundle('0.1.0-b3', 'bundles/0.1.0-b3');

    expect(Filesystem.rmdir).toHaveBeenCalledTimes(1);
    expect(Filesystem.rmdir).toHaveBeenCalledWith({
      path: 'bundles/0.1.0-b1',
      directory: Directory.Data,
      recursive: true,
    });
    expect(mockStore.activeBundlePath).toBe('bundles/0.1.0-b3');
    expect(mockStore.lastGoodBundlePath).toBe('bundles/0.1.0-b2');
  });
});
