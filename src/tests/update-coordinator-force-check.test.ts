import { App } from '@capacitor/app';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { getDbConnection } from '@/core/db/sqlite/connection';
import { updateCoordinator } from '@/services/updateCoordinator';

const mockStore: Record<string, string> = {};

const mocks = vi.hoisted(() => ({
  appGetInfo: vi.fn(),
  getDbConnection: vi.fn(),
  fetch: vi.fn(),
  applyBundleUpdate: vi.fn(),
  runHealthcheck: vi.fn(),
  markCurrentAsGood: vi.fn(),
  rollback: vi.fn(),
  startApkDownload: vi.fn(),
}));

vi.mock('@capacitor/app', () => ({
  App: { getInfo: mocks.appGetInfo },
}));

vi.mock('@/core/db/sqlite/connection', () => ({
  getDbConnection: mocks.getDbConnection,
}));

vi.mock('@/services/bundleUpdateService', () => ({
  applyBundleUpdate: mocks.applyBundleUpdate,
  runHealthcheck: mocks.runHealthcheck,
}));

vi.mock('@/services/rollbackService', () => ({
  markCurrentAsGood: mocks.markCurrentAsGood,
  rollback: mocks.rollback,
}));

vi.mock('@/services/apkDownloadService', () => ({
  startApkDownload: mocks.startApkDownload,
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
    }),
  };
}

function makeApiResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: vi.fn(async () => data),
  };
}

function getFetchMock(): Mock {
  return globalThis.fetch as unknown as Mock;
}

describe('updateCoordinator forceCheck', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(key => {
      delete mockStore[key];
    });
    vi.clearAllMocks();
    globalThis.fetch = mocks.fetch as unknown as typeof fetch;
    vi.mocked(App.getInfo).mockResolvedValue({
      version: '0.1.0',
      build: '100',
      name: 'TaiXiuCaNhan',
      id: 'app.test',
    });
    vi.mocked(getDbConnection).mockResolvedValue(createMockDb() as unknown as DbConnection);
    mocks.applyBundleUpdate.mockResolvedValue({ success: false });
    mocks.runHealthcheck.mockResolvedValue('pass');
    mocks.markCurrentAsGood.mockResolvedValue(undefined);
    mocks.rollback.mockResolvedValue(undefined);
    mocks.startApkDownload.mockResolvedValue({ filePath: 'apk', downloadedBytes: 1, totalBytes: 1 });
  });

  it('should return throttled when within 24h window and forceCheck=false', async () => {
    mockStore.lastCheckAt = String(Date.now());

    const result = await updateCoordinator.checkAndUpdate({ forceCheck: false });

    expect(result).toEqual({ strategy: 'none', status: 'throttled' });
    expect(getFetchMock()).not.toHaveBeenCalled();
  });

  it('should call API when within 24h window but forceCheck=true', async () => {
    mockStore.lastCheckAt = String(Date.now());
    getFetchMock().mockResolvedValueOnce(makeApiResponse({
      hasUpdate: false,
      nativeRequired: null,
      update: null,
    }));

    const result = await updateCoordinator.checkAndUpdate({ forceCheck: true });

    expect(result).toEqual({ strategy: 'none', status: 'up_to_date' });
    expect(getFetchMock()).toHaveBeenCalledTimes(1);
  });

  it('should preserve original throttle behavior when forceCheck is undefined', async () => {
    mockStore.lastCheckAt = String(Date.now());

    const result = await updateCoordinator.checkAndUpdate();

    expect(result).toEqual({ strategy: 'none', status: 'throttled' });
    expect(getFetchMock()).not.toHaveBeenCalled();
  });
});
