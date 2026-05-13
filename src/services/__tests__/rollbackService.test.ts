import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { markCurrentAsGood, promoteBundle, rollback } from '@/services/rollbackService';
import { getDbConnection } from '@/core/db/sqlite/connection';

const mocks = vi.hoisted(() => ({
  getDbConnection: vi.fn(),
  rmdir: vi.fn(),
}));

vi.mock('@capacitor/filesystem', () => ({
  Directory: {
    Data: 'DATA',
  },
  Filesystem: {
    rmdir: mocks.rmdir,
  },
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

let config: Map<string, string>;
let mockDb: MockDb;

function seedConfig(entries: Array<[string, string]>): void {
  config = new Map(entries);
}

function expectRmdirPath(path: string): void {
  expect(Filesystem.rmdir).toHaveBeenCalledWith({
    path,
    directory: Directory.Data,
    recursive: true,
  });
}

describe('rollbackService', () => {
  beforeEach(() => {
    config = new Map<string, string>();
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    mockDb = {
      execute: vi.fn(async () => undefined),
      query: vi.fn(async (_sql: string, params?: unknown[]) => {
        const key = typeof params?.[0] === 'string' ? params[0] : '';
        const value = config.get(key);
        return { values: value === undefined ? [] : [{ value }] };
      }),
      run: vi.fn(async (sql: string, params?: unknown[]) => {
        const key = typeof params?.[0] === 'string' ? params[0] : '';

        if (sql.startsWith('INSERT OR REPLACE')) {
          const value = typeof params?.[1] === 'string' ? params[1] : '';
          config.set(key, value);
        }
      }),
    };

    vi.mocked(getDbConnection).mockResolvedValue(mockDb as unknown as DbConnection);
    vi.mocked(Filesystem.rmdir).mockResolvedValue(undefined);
  });

  it('TC-01: rollback - happy path', async () => {
    seedConfig([
      ['activeBundlePath', 'bundles/0.1.0-b3'],
      ['lastGoodBundlePath', 'bundles/0.1.0-b2'],
      ['rollbackCount', '1'],
    ]);

    const result = await rollback();

    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
      ['activeBundlePath', 'bundles/0.1.0-b2'],
    );
    expectRmdirPath('bundles/0.1.0-b3');
    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
      ['rollbackCount', '2'],
    );
    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
      ['lastGoodBundlePath', ''],
    );
    expect(result).toEqual({ success: true, status: 'rolled_back', rollbackCount: 2 });
  });

  it('TC-02: rollback - no_fallback when lastGoodBundlePath is empty', async () => {
    seedConfig([['activeBundlePath', 'bundles/0.1.0-b3']]);

    const result = await rollback();

    expect(Filesystem.rmdir).not.toHaveBeenCalled();
    expect(mockDb.run).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, status: 'no_fallback' });
  });

  it('TC-03: rollback - rollbackCount starts from 0 when missing', async () => {
    seedConfig([
      ['activeBundlePath', 'bundles/0.1.0-b2'],
      ['lastGoodBundlePath', 'bundles/0.1.0-b1'],
    ]);

    const result = await rollback();

    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
      ['rollbackCount', '1'],
    );
    expect(result).toEqual({ success: true, status: 'rolled_back', rollbackCount: 1 });
  });

  it('TC-04: rollback - rollback_error when Filesystem.rmdir throws', async () => {
    seedConfig([
      ['activeBundlePath', 'bundles/0.1.0-b3'],
      ['lastGoodBundlePath', 'bundles/0.1.0-b2'],
    ]);
    vi.mocked(Filesystem.rmdir).mockRejectedValue(new Error('permission denied'));

    const result = await rollback();

    expect(result).toEqual({ success: false, status: 'rollback_error' });
  });

  it('TC-05: promoteBundle - deletes oldest bundle when two bundles already exist', async () => {
    seedConfig([
      ['activeBundlePath', 'bundles/0.1.0-b2'],
      ['lastGoodBundlePath', 'bundles/0.1.0-b1'],
    ]);

    await promoteBundle('0.1.0-b3', 'bundles/0.1.0-b3');

    expectRmdirPath('bundles/0.1.0-b1');
    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
      ['lastGoodBundlePath', 'bundles/0.1.0-b2'],
    );
    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
      ['activeBundlePath', 'bundles/0.1.0-b3'],
    );
  });

  it('TC-06: promoteBundle - does not delete when last-good is missing', async () => {
    seedConfig([['activeBundlePath', 'bundles/0.1.0-b1']]);

    await promoteBundle('0.1.0-b2', 'bundles/0.1.0-b2');

    expect(Filesystem.rmdir).not.toHaveBeenCalled();
    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)',
      ['lastGoodBundlePath', 'bundles/0.1.0-b1'],
    );
  });

  it('TC-07: markCurrentAsGood - does nothing when activeBundlePath is empty', async () => {
    await markCurrentAsGood();

    expect(mockDb.run).not.toHaveBeenCalled();
  });
});
