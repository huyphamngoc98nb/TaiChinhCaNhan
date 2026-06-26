import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as connection from '@/core/db/sqlite/connection';
import * as exportBackup from '@/modules/backup/services/export-backup-json';
import * as backupFileRepository from '@/modules/backup/services/backup-file.repository';
import * as backupRetention from '@/modules/backup/services/backup-retention.service';
import * as saveAutoBackup from '@/modules/backup/services/save-auto-backup-file';
import * as encryptedBackup from '@/modules/backup/services/encrypted-backup';
import {
  AUTO_BACKUP_PASSWORD_SECRET_KEY,
  secureSecretStore,
} from '@/core/security/secure-secret-store';
import { logger } from '@/core/telemetry/logger';
import {
  AUTO_BACKUP_INTERVAL_MS,
  AUTO_BACKUP_SETTING_KEYS,
  AutoBackupSettings,
  clearAutoBackupEncryptionPassword,
  createAutoBackupFileName,
  runAutoBackupIfDue,
  setAutoBackupEncryptionPassword,
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

vi.mock('@/modules/backup/services/backup-retention.service', () => ({
  cleanupOldAutoBackups: vi.fn(),
}));

vi.mock('@/modules/backup/services/encrypted-backup', () => ({
  encryptBackupPayload: vi.fn(),
}));

vi.mock('@/core/security/secure-secret-store', () => ({
  AUTO_BACKUP_PASSWORD_SECRET_KEY: 'auto_backup_password',
  isSecureSecretStoreAvailable: vi.fn(() => true),
  secureSecretStore: {
    setSecret: vi.fn(),
    getSecret: vi.fn(),
    removeSecret: vi.fn(),
    hasSecret: vi.fn(),
  },
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

    vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb as never);
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
    vi.mocked(backupRetention.cleanupOldAutoBackups).mockResolvedValue({
      skipped: false,
      deleted: 0,
      failed: 0,
    });
    vi.mocked(secureSecretStore.setSecret).mockResolvedValue({ saved: true });
    vi.mocked(secureSecretStore.getSecret).mockResolvedValue({ exists: false });
    vi.mocked(secureSecretStore.removeSecret).mockResolvedValue({ removed: true });
    vi.mocked(secureSecretStore.hasSecret).mockResolvedValue({ exists: false });
    vi.mocked(encryptedBackup.encryptBackupPayload).mockResolvedValue({
      metadata: { version: '2.0', schema_version: 16, exported_at: now, app_version: '0.1.0' },
      encryption: {
        format: 'expense-tracker-encrypted-backup',
        version: 1,
        algorithm: 'AES-GCM',
        kdf: 'PBKDF2',
        hash: 'SHA-256',
        iterations: 300_000,
        salt: 'salt',
        iv: 'iv',
      },
      ciphertext: 'ciphertext',
    });
  });

  it('detects whether auto backup is due by interval', () => {
    const baseSettings: AutoBackupSettings = {
      enabled: true,
      interval: 'daily',
      lastRunAt: now,
      encryptionEnabled: false,
      encryptionConfigured: false,
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

  it('stores the auto backup encryption password only in secure storage', async () => {
    vi.mocked(secureSecretStore.hasSecret).mockResolvedValue({ exists: true });

    const nextSettings = await setAutoBackupEncryptionPassword('super-secret');

    expect(secureSecretStore.setSecret).toHaveBeenCalledWith({
      key: AUTO_BACKUP_PASSWORD_SECRET_KEY,
      value: 'super-secret',
    });
    expect(nextSettings).toMatchObject({
      encryptionEnabled: true,
      encryptionConfigured: true,
    });
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.encryptionEnabled)).toBe('1');
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.encryptionConfigured)).toBe('1');
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.encryptionVersion)).toBe('1');
    expect([...settingsRows.values()]).not.toContain('super-secret');
  });

  it('clears auto backup encryption without storing the password in settings', async () => {
    const nextSettings = await clearAutoBackupEncryptionPassword();

    expect(secureSecretStore.removeSecret).toHaveBeenCalledWith({
      key: AUTO_BACKUP_PASSWORD_SECRET_KEY,
    });
    expect(nextSettings).toMatchObject({
      encryptionEnabled: false,
      encryptionConfigured: false,
    });
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.encryptionEnabled)).toBe('0');
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.encryptionConfigured)).toBe('0');
    expect([...settingsRows.values()]).not.toContain('super-secret');
  });

  it('runs export, registers metadata, cleans up retention, and updates last_run_at when due', async () => {
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
    const savedContent = vi.mocked(saveAutoBackup.saveAutoBackupFile).mock.calls[0][1];
    expect(JSON.parse(savedContent)).toMatchObject({
      metadata: { version: '2.0' },
      wallets: [],
      app_settings: [],
    });
    expect(backupFileRepository.registerBackupFile).toHaveBeenCalledWith({
      fileName: createAutoBackupFileName(new Date(now)),
      uri: 'content://backup/1',
      path: 'Download/Expense Tracker/backup.json',
      kind: 'auto',
      platform: 'android',
      encrypted: false,
      createdAt: now,
    });
    expect(backupRetention.cleanupOldAutoBackups).toHaveBeenCalledWith(now);
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.lastRunAt)).toBe(String(now));
  });

  it('encrypts auto backup payload and registers encrypted metadata when a secret exists', async () => {
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.enabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.interval, 'daily');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.lastRunAt, String(now - AUTO_BACKUP_INTERVAL_MS.daily));
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.encryptionEnabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.encryptionConfigured, '1');
    vi.mocked(secureSecretStore.hasSecret).mockResolvedValue({ exists: true });
    vi.mocked(secureSecretStore.getSecret).mockResolvedValue({
      exists: true,
      value: 'super-secret',
    });

    const result = await runAutoBackupIfDue(now);

    expect(result).toMatchObject({
      ran: true,
      saved: true,
      reason: 'saved',
      settings: { encryptionEnabled: true, encryptionConfigured: true },
    });
    expect(encryptedBackup.encryptBackupPayload).toHaveBeenCalledWith(
      expect.objectContaining({ app_settings: [] }),
      'super-secret'
    );
    expect(saveAutoBackup.saveAutoBackupFile).toHaveBeenCalledWith(
      createAutoBackupFileName(new Date(now)),
      expect.stringContaining('"ciphertext": "ciphertext"')
    );
    expect(backupFileRepository.registerBackupFile).toHaveBeenCalledWith(
      expect.objectContaining({ encrypted: true })
    );
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.lastRunAt)).toBe(String(now));
  });

  it('does not save plaintext or update last_run_at when encryption secret is missing', async () => {
    const previousRunAt = now - AUTO_BACKUP_INTERVAL_MS.daily;
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.enabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.interval, 'daily');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.lastRunAt, String(previousRunAt));
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.encryptionEnabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.encryptionConfigured, '1');
    vi.mocked(secureSecretStore.hasSecret).mockResolvedValue({ exists: false });

    const result = await runAutoBackupIfDue(now);

    expect(result).toMatchObject({
      ran: true,
      saved: false,
      reason: 'missing_encryption_secret',
      settings: { encryptionEnabled: true, encryptionConfigured: false },
    });
    expect(exportBackup.exportBackupJson).not.toHaveBeenCalled();
    expect(saveAutoBackup.saveAutoBackupFile).not.toHaveBeenCalled();
    expect(backupFileRepository.registerBackupFile).not.toHaveBeenCalled();
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.lastRunAt)).toBe(String(previousRunAt));
  });

  it('does not save or update last_run_at when auto backup encryption fails', async () => {
    const previousRunAt = now - AUTO_BACKUP_INTERVAL_MS.daily;
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.enabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.interval, 'daily');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.lastRunAt, String(previousRunAt));
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.encryptionEnabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.encryptionConfigured, '1');
    vi.mocked(secureSecretStore.hasSecret).mockResolvedValue({ exists: true });
    vi.mocked(secureSecretStore.getSecret).mockResolvedValue({
      exists: true,
      value: 'super-secret',
    });
    vi.mocked(encryptedBackup.encryptBackupPayload).mockRejectedValue(new Error('encrypt failed'));

    const result = await runAutoBackupIfDue(now);

    expect(result).toMatchObject({ ran: true, saved: false, reason: 'encryption_failed' });
    expect(saveAutoBackup.saveAutoBackupFile).not.toHaveBeenCalled();
    expect(backupFileRepository.registerBackupFile).not.toHaveBeenCalled();
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.lastRunAt)).toBe(String(previousRunAt));
    const loggerCalls = JSON.stringify(vi.mocked(logger.error).mock.calls);
    expect(loggerCalls).not.toContain('super-secret');
  });

  it('does not export or save when disabled', async () => {
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.enabled, '0');

    const result = await runAutoBackupIfDue(now);

    expect(result).toMatchObject({ ran: false, saved: false, reason: 'disabled' });
    expect(exportBackup.exportBackupJson).not.toHaveBeenCalled();
    expect(saveAutoBackup.saveAutoBackupFile).not.toHaveBeenCalled();
    expect(backupFileRepository.registerBackupFile).not.toHaveBeenCalled();
    expect(backupRetention.cleanupOldAutoBackups).not.toHaveBeenCalled();
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
    expect(backupRetention.cleanupOldAutoBackups).not.toHaveBeenCalled();
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.lastRunAt)).toBe(String(previousRunAt));
  });

  it('keeps auto backup successful when cleanup throws', async () => {
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.enabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.interval, 'daily');
    vi.mocked(backupRetention.cleanupOldAutoBackups).mockRejectedValue(new Error('cleanup failed'));

    const result = await runAutoBackupIfDue(now);

    expect(result).toMatchObject({ ran: true, saved: true, reason: 'saved' });
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.lastRunAt)).toBe(String(now));
    expect(logger.warn).toHaveBeenCalledWith(
      'Auto backup retention cleanup failed after backup save.',
      expect.any(Error),
      { context: 'AutoBackupService' }
    );
  });

  it('keeps auto backup successful and logs when cleanup reports failures', async () => {
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.enabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.interval, 'daily');
    vi.mocked(backupRetention.cleanupOldAutoBackups).mockResolvedValue({
      skipped: false,
      deleted: 1,
      failed: 2,
    });

    const result = await runAutoBackupIfDue(now);

    expect(result).toMatchObject({
      ran: true,
      saved: true,
      reason: 'saved',
      retention: { skipped: false, deleted: 1, failed: 2 },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Auto backup retention completed with failures.',
      expect.objectContaining({
        context: 'AutoBackupService',
        metadata: { failed: 2, deleted: 1 },
      })
    );
  });

  it('keeps auto backup successful and skips cleanup when metadata registration fails', async () => {
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.enabled, '1');
    settingsRows.set(AUTO_BACKUP_SETTING_KEYS.interval, 'daily');
    vi.mocked(backupFileRepository.registerBackupFile).mockRejectedValue(
      new Error('metadata failed')
    );

    const result = await runAutoBackupIfDue(now);

    expect(result).toMatchObject({ ran: true, saved: true, reason: 'saved' });
    expect(settingsRows.get(AUTO_BACKUP_SETTING_KEYS.lastRunAt)).toBe(String(now));
    expect(backupRetention.cleanupOldAutoBackups).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Auto backup file was saved but metadata registration failed.',
      expect.any(Error),
      { context: 'AutoBackupService' }
    );
  });
});
