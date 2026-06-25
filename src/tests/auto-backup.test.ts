import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as connection from '@/core/db/sqlite/connection';
import * as exportBackup from '@/modules/backup/services/export-backup-json';
import * as backupFileRepository from '@/modules/backup/services/backup-file.repository';
import * as saveAutoBackup from '@/modules/backup/services/save-auto-backup-file';
import {
  AUTO_BACKUP_INTERVAL_MS,
  AUTO_BACKUP_SETTING_KEYS,
  AutoBackupSettings,
  createAutoBackupFileName,
  runAutoBackupIfDue,
  shouldRunAutoBackup,
  updateAutoBackupSettings,
} from '@/modules/backup/services/auto-backup.service';

vi.mock('@/core/db/sqlite/connection', () => ({
  getDbConnection: vi.fn(),
}));

vi.mock('@/modules/backup/services/export-backup-json', () => ({
  exportBackupJson: vi.fn(),
}));

vi.mock('@/modules/backup/services/save-auto-backup-file', () => ({
  saveAutoBackupFile: vi.fn(),
}));

vi.mock('@/modules/backup/services/backup-file.repository', () => ({
  registerBackupFile: vi.fn(),
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('auto backup service', () => {
  const now = 1_700_000_000_000;
  let settingsRows: Map<string, string>;
  let mockDb: { query: ReturnType<typeof vi.fn>; run: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    settingsRows = new Map();
    mockDb = {
      query: vi.fn(async () => ({
        values: Array.from(settingsRows.entries()).map(([key, value]) => ({ key, value })),
      })),
      run: vi.fn(async (_sql: string, params: unknown[]) => {
        settingsRows.set(String(params[0]), String(params[1]));
        return { changes: { changes: 1 } };
      }),
    };

    vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb as any);
    vi.mocked(exportBackup.exportBackupJson).mockResolvedValue({
      metadata: { version: '2.0', schema_version: 16, exported_at: now, app_version: '0.1.0' },
      wallets: [],
      categories: [],
      transactions: [],
      recurring_bills: [],
      app_settings: [],
      budgets: [],
      error_logs: [],
      loans: [],
      loan_payments: [],
    });
    vi.mocked(saveAutoBackup.saveAutoBackupFile).mockResolvedValue({
      saved: true,
      fileName: createAutoBackupFileName(new Date(now)),
      uri: 'content://backup/1',
      path: 'Download/Expense Tracker/backup.json',
      platform: 'android',
    });
    vi.mocked(backupFileRepository.registerBackupFile).mockResolvedValue({
      id: 'backup-file-1',
      fileName: createAutoBackupFileName(new Date(now)),
      uri: 'content://backup/1',
      path: 'Download/Expense Tracker/backup.json',
      kind: 'auto',
      platform: 'android',
      encrypted: false,
      createdAt: now,
      deletedAt: null,
    });
  });

  it('detects whether auto backup is due by interval', () => {
    const baseSettings: AutoBackupSettings = {
      enabled: true,
      interval: 'daily',
      lastRunAt: now,
    };

    expect(shouldRunAutoBackup({ ...baseSettings, enabled: false }, now + AUTO_BACKUP_INTERVAL_MS.daily)).toBe(false);
    expect(shouldRunAutoBackup({ ...baseSettings, lastRunAt: null }, now)).toBe(true);
    expect(shouldRunAutoBackup(baseSettings, now + AUTO_BACKUP_INTERVAL_MS.daily - 1)).toBe(false);
    expect(shouldRunAutoBackup(baseSettings, now + AUTO_BACKUP_INTERVAL_MS.daily)).toBe(true);
  });

  it('persists enabled and interval settings', async () => {
    const nextSettings = await updateAutoBackupSettings({
      enabled: true,
      interval: 'weekly',
    });

    expect(nextSettings).toMatchObject({ enabled: true, interval: 'weekly' });
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.enabled)).toBe('1');
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.interval)).toBe('weekly');
  });

  it('runs export and updates last_run_at when due', async () => {
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.enabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.interval, 'daily');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.lastRunAt, String(now - AUTO_BACKUP_INTERVAL_MS.daily));

    const result = await runAutoBackupIfDue(now);

    expect(result).toMatchObject({ ran: true, saved: true, reason: 'saved' });
    expect(exportBackup.exportBackupJson).toHaveBeenCalledTimes(1);
    expect(saveAutoBackup.saveAutoBackupFile).toHaveBeenCalledWith(
      createAutoBackupFileName(new Date(now)),
      expect.any(String)
    );
    expect(backupFileRepository.registerBackupFile).toHaveBeenCalledWith({
      fileName: createAutoBackupFileName(new Date(now)),
      uri: 'content://backup/1',
      path: 'Download/Expense Tracker/backup.json',
      kind: 'auto',
      platform: 'android',
      encrypted: false,
      createdAt: now,
    });
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.lastRunAt)).toBe(String(now));
  });

  it('does not export or save when disabled', async () => {
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.enabled, '0');

    const result = await runAutoBackupIfDue(now);

    expect(result).toMatchObject({ ran: false, saved: false, reason: 'disabled' });
    expect(exportBackup.exportBackupJson).not.toHaveBeenCalled();
    expect(saveAutoBackup.saveAutoBackupFile).not.toHaveBeenCalled();
    expect(backupFileRepository.registerBackupFile).not.toHaveBeenCalled();
  });

  it('does not update last_run_at when save is cancelled', async () => {
    const previousRunAt = now - AUTO_BACKUP_INTERVAL_MS.weekly;
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.enabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.interval, 'weekly');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.lastRunAt, String(previousRunAt));
    vi.mocked(saveAutoBackup.saveAutoBackupFile).mockResolvedValue({ saved: false });

    const result = await runAutoBackupIfDue(now);

    expect(result).toMatchObject({ ran: true, saved: false, reason: 'save_cancelled' });
    expect(backupFileRepository.registerBackupFile).not.toHaveBeenCalled();
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.lastRunAt)).toBe(String(previousRunAt));
  });
});
