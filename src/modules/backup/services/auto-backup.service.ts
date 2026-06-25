import { getDbConnection } from '@/core/db/sqlite/connection';
import { logger } from '@/core/telemetry/logger';
import { exportBackupJson } from './export-backup-json';
import { registerBackupFile } from './backup-file.repository';
import { saveAutoBackupFile } from './save-auto-backup-file';

export const AUTO_BACKUP_SETTING_KEYS = {
  enabled: 'auto_backup_enabled',
  interval: 'auto_backup_interval',
  lastRunAt: 'auto_backup_last_run_at',
} as const;

export const AUTO_BACKUP_INTERVALS = ['daily', 'weekly', 'monthly'] as const;

export type AutoBackupInterval = (typeof AUTO_BACKUP_INTERVALS)[number];

export interface AutoBackupSettings {
  enabled: boolean;
  interval: AutoBackupInterval;
  lastRunAt: number | null;
}

export interface UpdateAutoBackupSettingsInput {
  enabled?: boolean;
  interval?: AutoBackupInterval;
}

export type AutoBackupRunReason =
  | 'disabled'
  | 'not_due'
  | 'saved'
  | 'save_cancelled'
  | 'failed';

export interface AutoBackupRunResult {
  ran: boolean;
  saved: boolean;
  reason: AutoBackupRunReason;
  fileName?: string;
  settings?: AutoBackupSettings;
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

export async function getAutoBackupSettings(): Promise<AutoBackupSettings> {
  const values = await readAutoBackupSettingValues();

  return {
    enabled: values[AUTO_BACKUP_SETTING_KEYS.enabled] === '1',
    interval: normalizeInterval(values[AUTO_BACKUP_SETTING_KEYS.interval]),
    lastRunAt: parseLastRunAt(values[AUTO_BACKUP_SETTING_KEYS.lastRunAt]),
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

    const payload = await exportBackupJson();
    const fileName = createAutoBackupFileName(new Date(now));
    const savedFile = await saveAutoBackupFile(fileName, JSON.stringify(payload, null, 2));

    if (!savedFile.saved) {
      return { ran: true, saved: false, reason: 'save_cancelled', fileName, settings };
    }

    try {
      await registerBackupFile({
        fileName: savedFile.fileName ?? fileName,
        uri: savedFile.uri,
        path: savedFile.path,
        kind: 'auto',
        platform: savedFile.platform ?? 'unknown',
        encrypted: false,
        createdAt: now,
      });
    } catch (error) {
      logger.warn('Auto backup file was saved but metadata registration failed.', error, {
        context: 'AutoBackupService',
      });
    }

    await updateLastRunAt(now);

    return {
      ran: true,
      saved: true,
      reason: 'saved',
      fileName,
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
