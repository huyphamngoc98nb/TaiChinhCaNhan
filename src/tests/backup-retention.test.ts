import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as connection from '@/core/db/sqlite/connection';
import { documentSaver } from '@/core/files/document-saver';
import { logger } from '@/core/telemetry/logger';
import {
  BACKUP_RETENTION_SETTING_KEYS,
  cleanupOldAutoBackups,
  getAutoBackupRetentionSettings,
} from '@/modules/backup/services/backup-retention.service';
import { listActiveAutoBackupFiles } from '@/modules/backup/services/backup-file.repository';

vi.mock('@/core/db/sqlite/connection', () => ({
  getDbConnection: vi.fn(),
}));

vi.mock('@/core/files/document-saver', () => ({
  documentSaver: {
    deleteSavedFile: vi.fn(),
  },
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

type BackupFileRow = {
  id: string;
  file_name: string;
  uri: string | null;
  path: string | null;
  kind: 'auto' | 'manual';
  platform: string;
  encrypted: number;
  created_at: number;
  deleted_at: number | null;
};

describe('backup retention service', () => {
  const now = 1_700_000_000_000;
  let settingsRows: Map<string, string>;
  let backupFileRows: BackupFileRow[];
  let mockDb: { query: ReturnType<typeof vi.fn>; run: ReturnType<typeof vi.fn> };

  function makeBackupRow(index: number, kind: 'auto' | 'manual' = 'auto'): BackupFileRow {
    return {
      id: `${kind}-${index}`,
      file_name: `${kind}-${index}.json`,
      uri: `content://backup/${kind}-${index}`,
      path: `Download/Expense Tracker/${kind}-${index}.json`,
      kind,
      platform: 'android',
      encrypted: 0,
      created_at: now - index,
      deleted_at: null,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    settingsRows = new Map([
      [BACKUP_RETENTION_SETTING_KEYS.enabled, '1'],
      [BACKUP_RETENTION_SETTING_KEYS.maxFiles, '7'],
    ]);
    backupFileRows = [];
    mockDb = {
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        if (sql.includes('FROM app_settings')) {
          return {
            values: Array.from(settingsRows.entries()).map(([key, value]) => ({ key, value })),
          };
        }

        if (sql.includes('FROM backup_files')) {
          const kind = params[0];
          return {
            values: backupFileRows
              .filter((row) => row.kind === kind && row.deleted_at === null)
              .sort((left, right) => right.created_at - left.created_at),
          };
        }

        return { values: [] };
      }),
      run: vi.fn(async (sql: string, params: unknown[]) => {
        if (sql.includes('UPDATE backup_files')) {
          const [deletedAt, id] = params;
          const row = backupFileRows.find((item) => item.id === id);
          if (row) {
            row.deleted_at = Number(deletedAt);
          }
        }

        if (sql.includes('INSERT OR REPLACE INTO app_settings')) {
          settingsRows.set(String(params[0]), String(params[1]));
        }

        return { changes: { changes: 1 } };
      }),
    };

    vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb as never);
    vi.mocked(documentSaver.deleteSavedFile).mockResolvedValue({ deleted: true });
  });

  it('deletes the oldest 3 files when 10 auto backups exist and maxFiles is 7', async () => {
    backupFileRows = Array.from({ length: 10 }, (_value, index) => makeBackupRow(index));

    const result = await cleanupOldAutoBackups(now);

    expect(result).toEqual({ skipped: false, deleted: 3, failed: 0 });
    expect(documentSaver.deleteSavedFile).toHaveBeenCalledTimes(3);
    expect(backupFileRows.filter((row) => row.deleted_at === now).map((row) => row.id))
      .toEqual(['auto-7', 'auto-8', 'auto-9']);
  });

  it('does not delete when active auto backup count equals maxFiles', async () => {
    backupFileRows = Array.from({ length: 7 }, (_value, index) => makeBackupRow(index));

    const result = await cleanupOldAutoBackups(now);

    expect(result).toEqual({ skipped: false, deleted: 0, failed: 0 });
    expect(documentSaver.deleteSavedFile).not.toHaveBeenCalled();
  });

  it('skips cleanup when retention is disabled', async () => {
    settingsRows.set(BACKUP_RETENTION_SETTING_KEYS.enabled, '0');
    backupFileRows = Array.from({ length: 10 }, (_value, index) => makeBackupRow(index));

    const result = await cleanupOldAutoBackups(now);

    expect(result).toEqual({ skipped: true, deleted: 0, failed: 0 });
    expect(documentSaver.deleteSavedFile).not.toHaveBeenCalled();
  });

  it('falls back to default settings when maxFiles is invalid', async () => {
    settingsRows.set(BACKUP_RETENTION_SETTING_KEYS.maxFiles, '31');

    await expect(getAutoBackupRetentionSettings()).resolves.toEqual({
      enabled: true,
      maxFiles: 7,
    });
  });

  it('marks a successfully deleted file as deleted', async () => {
    backupFileRows = Array.from({ length: 8 }, (_value, index) => makeBackupRow(index));

    await cleanupOldAutoBackups(now);

    expect(backupFileRows.find((row) => row.id === 'auto-7')?.deleted_at).toBe(now);
  });

  it('marks a missing saved file as deleted', async () => {
    backupFileRows = Array.from({ length: 8 }, (_value, index) => makeBackupRow(index));
    vi.mocked(documentSaver.deleteSavedFile).mockResolvedValue({ deleted: false, missing: true });

    const result = await cleanupOldAutoBackups(now);

    expect(result).toEqual({ skipped: false, deleted: 1, failed: 0 });
    expect(backupFileRows.find((row) => row.id === 'auto-7')?.deleted_at).toBe(now);
  });

  it('logs delete failures and does not throw', async () => {
    backupFileRows = Array.from({ length: 8 }, (_value, index) => makeBackupRow(index));
    vi.mocked(documentSaver.deleteSavedFile).mockRejectedValue(new Error('delete failed'));

    const result = await cleanupOldAutoBackups(now);

    expect(result).toEqual({ skipped: false, deleted: 0, failed: 1 });
    expect(logger.warn).toHaveBeenCalledWith(
      'Auto backup retention delete failed.',
      expect.any(Error),
      expect.objectContaining({ context: 'BackupRetentionService' })
    );
  });

  it('lists and deletes only active auto backup records', async () => {
    backupFileRows = [
      ...Array.from({ length: 8 }, (_value, index) => makeBackupRow(index)),
      makeBackupRow(100, 'manual'),
      { ...makeBackupRow(101), id: 'auto-deleted', deleted_at: now - 1 },
    ];

    const activeAutoFiles = await listActiveAutoBackupFiles();
    const result = await cleanupOldAutoBackups(now);

    expect(activeAutoFiles.map((file) => file.id)).toEqual([
      'auto-0',
      'auto-1',
      'auto-2',
      'auto-3',
      'auto-4',
      'auto-5',
      'auto-6',
      'auto-7',
    ]);
    expect(result).toEqual({ skipped: false, deleted: 1, failed: 0 });
    expect(documentSaver.deleteSavedFile).toHaveBeenCalledWith({
      uri: 'content://backup/auto-7',
      path: 'Download/Expense Tracker/auto-7.json',
    });
    expect(backupFileRows.find((row) => row.id === 'manual-100')?.deleted_at).toBeNull();
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE kind = ? AND deleted_at IS NULL"),
      ['auto']
    );
  });
});
