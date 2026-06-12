import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import {
  clearNativeEncryptionSecret,
  deleteLocalDatabase,
} from '@/core/db/reset-local-data';
import { sqlite } from '@/core/db/sqlite/pragmas';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
  },
}));

vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {
    deleteDatabase: vi.fn(),
  },
  SQLiteConnection: vi.fn(),
}));

vi.mock('@/core/db/sqlite/pragmas', () => ({
  sqlite: {
    isConnection: vi.fn(),
    closeConnection: vi.fn(),
    clearEncryptionSecret: vi.fn(),
  },
}));

describe('reset local data SQLite helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
  });

  it('closes an existing connection before deleting the local database', async () => {
    const calls: string[] = [];
    vi.mocked(sqlite.isConnection).mockResolvedValue({ result: true });
    vi.mocked(sqlite.closeConnection).mockImplementation(async () => { calls.push('close'); });
    vi.mocked(CapacitorSQLite.deleteDatabase).mockImplementation(async () => { calls.push('delete'); });

    await deleteLocalDatabase();

    expect(calls).toEqual(['close', 'delete']);
  });

  it('clears native secrets but skips unsupported web secret storage', async () => {
    await clearNativeEncryptionSecret();
    expect(sqlite.clearEncryptionSecret).toHaveBeenCalledTimes(1);

    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    await clearNativeEncryptionSecret();
    expect(sqlite.clearEncryptionSecret).toHaveBeenCalledTimes(1);
  });
});
