import { getDbConnection } from '@/core/db/sqlite/connection';
import { logger } from '@/core/telemetry/logger';
import { exportBackupJson } from './export-backup-json';
import { registerBackupFile } from './backup-file.repository';
import { cleanupOldAutoBackups } from './backup-retention.service';
import { saveAutoBackupFile } from './save-auto-backup-file';
import { encryptBackupPayload } from './encrypted-backup';
import {
  AUTO_BACKUP_PASSWORD_SECRET_KEY,
  secureSecretStore,
} from '@/core/security/secure-secret-store';

export const AUTO_BACKUP_SETTING_KEYS = {
  enabled: 'auto_backup_enabled',
  interval: 'auto_backup_interval',
  lastRunAt: 'auto_backup_last_run_at',
  encryptionEnabled: 'auto_backup_encryption_enabled',
  encryptionConfigured: 'auto_backup_encryption_configured',
  encryptionVersion: 'auto_backup_encryption_version',
} as const;

const AUTO_BACKUP_ENCRYPTION_VERSION = '1';
const MIN_AUTO_BACKUP_PASSWORD_LENGTH = 8;

export const AUTO_BACKUP_INTERVALS = ['daily', 'weekly', 'monthly'] as const;

export type AutoBackupInterval = (typeof AUTO_BACKUP_INTERVALS)[number];

export interface AutoBackupSettings {
  enabled: boolean;
  interval: AutoBackupInterval;
  lastRunAt: number | null;
  encryptionEnabled: boolean;
  encryptionConfigured: boolean;
}

export interface UpdateAutoBackupSettingsInput {
  enabled?: boolean;
  interval?: AutoBackupInterval;
}

export type AutoBackupRunReason =
  | 'disabled'
  | 'not_due'
  | 'missing_encryption_secret'
  | 'encryption_failed'
  | 'saved'
  | 'save_cancelled'
  | 'failed';

export interface AutoBackupRunResult {
  ran: boolean;
  saved: boolean;
  reason: AutoBackupRunReason;
  fileName?: string;
  settings?: AutoBackupSettings;
  retention?: {
    skipped: boolean;
    deleted: number;
    failed: number;
  };
  error?: unknown;
}

export const AUTO_BACKUP_INTERVAL_MS: Record<AutoBackupInterval, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

const DEFAULT_AUTO_BACKUP_SETTINGS: AutoBackupSettings = {
  enabled: false,
  interval: 'daily',
  lastRunAt: null,
  encryptionEnabled: false,
  encryptionConfigured: false,
};

let autoBackupRunPromise: Promise<AutoBackupRunResult> | null = null;

function isAutoBackupInterval(value: unknown): value is AutoBackupInterval {
  return (
    typeof value === 'string' &&
    AUTO_BACKUP_INTERVALS.includes(value as AutoBackupInterval)
  );
}

function normalizeInterval(value: unknown): AutoBackupInterval {
  return isAutoBackupInterval(value) ? value : DEFAULT_AUTO_BACKUP_SETTINGS.interval;
}

function parseLastRunAt(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;

  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function formatDatePart(value: number): string {
  return value.toString().padStart(2, '0');
}

export function createAutoBackupFileName(date = new Date()): string {
  const year = date.getFullYear();
  const month = formatDatePart(date.getMonth() + 1);
  const day = formatDatePart(date.getDate());
  const hour = formatDatePart(date.getHours());
  const minute = formatDatePart(date.getMinutes());

  return `expense_tracker_auto_backup_${year}-${month}-${day}_${hour}-${minute}.json`;
}

async function readAutoBackupSettingValues(): Promise<Record<string, string | undefined>> {
  const keys = Object.values(AUTO_BACKUP_SETTING_KEYS);
  const placeholders = keys.map(() => '?').join(', ');
  const db = await getDbConnection();
  const { values } = await db.query(
    `SELECT key, value FROM app_settings WHERE key IN (${placeholders})`,
    keys
  );

  return (values ?? []).reduce<Record<string, string | undefined>>((acc, row) => {
    const key = (row as Record<string, unknown>).key;
    const value = (row as Record<string, unknown>).value;

    if (typeof key === 'string' && typeof value === 'string') {
      acc[key] = value;
    }

    return acc;
  }, {});
}

async function upsertAppSetting(key: string, value: string): Promise<void> {
  const db = await getDbConnection();
  await db.run(
    `INSERT OR REPLACE INTO app_settings (key, value, updated_at)
     VALUES (?, ?, ?)`,
    [key, value, Date.now()]
  );
}

async function updateLastRunAt(timestamp: number): Promise<void> {
  await upsertAppSetting(AUTO_BACKUP_SETTING_KEYS.lastRunAt, String(timestamp));
}

async function getAutoBackupEncryptionSecret(): Promise<string | null> {
  const result = await secureSecretStore.getSecret({ key: AUTO_BACKUP_PASSWORD_SECRET_KEY });
  return result.exists && typeof result.value === 'string' ? result.value : null;
}

export async function hasAutoBackupEncryptionPassword(): Promise<boolean> {
  const result = await secureSecretStore.hasSecret({ key: AUTO_BACKUP_PASSWORD_SECRET_KEY });
  return result.exists;
}

export async function getAutoBackupSettings(): Promise<AutoBackupSettings> {
  const values = await readAutoBackupSettingValues();
  const encryptionEnabled = values[AUTO_BACKUP_SETTING_KEYS.encryptionEnabled] === '1';
  const storedEncryptionConfigured =
    values[AUTO_BACKUP_SETTING_KEYS.encryptionConfigured] === '1';
  const encryptionConfigured = storedEncryptionConfigured
    ? await hasAutoBackupEncryptionPassword().catch(() => false)
    : false;

  return {
    enabled: values[AUTO_BACKUP_SETTING_KEYS.enabled] === '1',
    interval: normalizeInterval(values[AUTO_BACKUP_SETTING_KEYS.interval]),
    lastRunAt: parseLastRunAt(values[AUTO_BACKUP_SETTING_KEYS.lastRunAt]),
    encryptionEnabled,
    encryptionConfigured,
  };
}

export async function updateAutoBackupSettings(
  input: UpdateAutoBackupSettingsInput
): Promise<AutoBackupSettings> {
  const current = await getAutoBackupSettings();
  const next: AutoBackupSettings = {
    ...current,
    enabled: input.enabled ?? current.enabled,
    interval: input.interval ? normalizeInterval(input.interval) : current.interval,
  };

  if (typeof input.enabled === 'boolean') {
    await upsertAppSetting(AUTO_BACKUP_SETTING_KEYS.enabled, input.enabled ? '1' : '0');
  }

  if (input.interval) {
    await upsertAppSetting(AUTO_BACKUP_SETTING_KEYS.interval, next.interval);
  }

  return next;
}

export async function setAutoBackupEncryptionPassword(
  password: string
): Promise<AutoBackupSettings> {
  if (password.length < MIN_AUTO_BACKUP_PASSWORD_LENGTH) {
    throw new Error('Auto backup password must be at least 8 characters.');
  }

  const result = await secureSecretStore.setSecret({
    key: AUTO_BACKUP_PASSWORD_SECRET_KEY,
    value: password,
  });

  if (!result.saved) {
    throw new Error('Secure secret storage is not available.');
  }

  await upsertAppSetting(AUTO_BACKUP_SETTING_KEYS.encryptionEnabled, '1');
  await upsertAppSetting(AUTO_BACKUP_SETTING_KEYS.encryptionConfigured, '1');
  await upsertAppSetting(
    AUTO_BACKUP_SETTING_KEYS.encryptionVersion,
    AUTO_BACKUP_ENCRYPTION_VERSION
  );

  return getAutoBackupSettings();
}

export async function clearAutoBackupEncryptionPassword(): Promise<AutoBackupSettings> {
  await secureSecretStore.removeSecret({ key: AUTO_BACKUP_PASSWORD_SECRET_KEY });
  await upsertAppSetting(AUTO_BACKUP_SETTING_KEYS.encryptionEnabled, '0');
  await upsertAppSetting(AUTO_BACKUP_SETTING_KEYS.encryptionConfigured, '0');
  await upsertAppSetting(
    AUTO_BACKUP_SETTING_KEYS.encryptionVersion,
    AUTO_BACKUP_ENCRYPTION_VERSION
  );

  return getAutoBackupSettings();
}

export function shouldRunAutoBackup(
  settings: AutoBackupSettings,
  now = Date.now()
): boolean {
  if (!settings.enabled) return false;
  if (!settings.lastRunAt) return true;

  return now - settings.lastRunAt >= AUTO_BACKUP_INTERVAL_MS[settings.interval];
}

async function runAutoBackupIfDueInternal(now: number): Promise<AutoBackupRunResult> {
  try {
    const settings = await getAutoBackupSettings();

    if (!settings.enabled) {
      return { ran: false, saved: false, reason: 'disabled', settings };
    }

    if (!shouldRunAutoBackup(settings, now)) {
      return { ran: false, saved: false, reason: 'not_due', settings };
    }

    let password: string | null = null;
    if (settings.encryptionEnabled) {
      password = settings.encryptionConfigured
        ? await getAutoBackupEncryptionSecret().catch(() => null)
        : null;

      if (!password) {
        return {
          ran: true,
          saved: false,
          reason: 'missing_encryption_secret',
          settings: {
            ...settings,
            encryptionConfigured: false,
          },
        };
      }
    }

    const payload = await exportBackupJson();
    const fileName = createAutoBackupFileName(new Date(now));
    const encrypted = Boolean(settings.encryptionEnabled && password);
    let backupContent: string;

    try {
      const backup = encrypted ? await encryptBackupPayload(payload, password as string) : payload;
      backupContent = JSON.stringify(backup, null, 2);
    } catch (error) {
      logger.error('Auto backup encryption failed', error, { context: 'AutoBackupService' });
      return { ran: true, saved: false, reason: 'encryption_failed', fileName, settings, error };
    }

    const savedFile = await saveAutoBackupFile(fileName, backupContent);

    if (!savedFile.saved) {
      return { ran: true, saved: false, reason: 'save_cancelled', fileName, settings };
    }

    let metadataRegistered = false;

    try {
      await registerBackupFile({
        fileName: savedFile.fileName ?? fileName,
        uri: savedFile.uri,
        path: savedFile.path,
        kind: 'auto',
        platform: savedFile.platform ?? 'unknown',
        encrypted,
        createdAt: now,
      });
      metadataRegistered = true;
    } catch (error) {
      logger.warn('Auto backup file was saved but metadata registration failed.', error, {
        context: 'AutoBackupService',
      });
    }

    await updateLastRunAt(now);

    let retention: AutoBackupRunResult['retention'];

    if (metadataRegistered) {
      try {
        retention = await cleanupOldAutoBackups(now);
        if (retention.failed > 0) {
          logger.warn('Auto backup retention completed with failures.', {
            context: 'AutoBackupService',
            metadata: { failed: retention.failed, deleted: retention.deleted },
          });
        }
      } catch (error) {
        logger.warn('Auto backup retention cleanup failed after backup save.', error, {
          context: 'AutoBackupService',
        });
      }
    }

    return {
      ran: true,
      saved: true,
      reason: 'saved',
      fileName,
      retention,
      settings: {
        ...settings,
        lastRunAt: now,
      },
    };
  } catch (error) {
    logger.error('Auto backup failed', error, { context: 'AutoBackupService' });
    return { ran: false, saved: false, reason: 'failed', error };
  }
}

export function runAutoBackupIfDue(now = Date.now()): Promise<AutoBackupRunResult> {
  if (!autoBackupRunPromise) {
    autoBackupRunPromise = runAutoBackupIfDueInternal(now).finally(() => {
      autoBackupRunPromise = null;
    });
  }

  return autoBackupRunPromise;
}
