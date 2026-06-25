import { getDbConnection } from '@/core/db/sqlite/connection';
import { documentSaver } from '@/core/files/document-saver';
import { logger } from '@/core/telemetry/logger';
import type { BackupRetentionSettings } from '../domain/backup-file.model';
import {
  listActiveAutoBackupFiles,
  markBackupFileDeleted,
} from './backup-file.repository';

export const BACKUP_RETENTION_SETTING_KEYS = {
  enabled: 'auto_backup_retention_enabled',
  maxFiles: 'auto_backup_retention_max_files',
} as const;

export interface UpdateBackupRetentionSettingsInput {
  enabled?: boolean;
  maxFiles?: number;
}

export interface BackupRetentionCleanupResult {
  skipped: boolean;
  deleted: number;
  failed: number;
}

export const DEFAULT_BACKUP_RETENTION_SETTINGS: BackupRetentionSettings = {
  enabled: true,
  maxFiles: 7,
};

const MIN_RETENTION_FILES = 1;
const MAX_RETENTION_FILES = 30;

function normalizeMaxFiles(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value;

  if (
    typeof parsed !== 'number' ||
    !Number.isInteger(parsed) ||
    parsed < MIN_RETENTION_FILES ||
    parsed > MAX_RETENTION_FILES
  ) {
    return DEFAULT_BACKUP_RETENTION_SETTINGS.maxFiles;
  }

  return parsed;
}

async function readRetentionSettingValues(): Promise<Record<string, string | undefined>> {
  const keys = Object.values(BACKUP_RETENTION_SETTING_KEYS);
  const placeholders = keys.map(() => '?').join(', ');
  const db = await getDbConnection();
  const { values } = await db.query(
    `SELECT key, value FROM app_settings WHERE key IN (${placeholders})`,
    keys
  );

  return (values ?? []).reduce<Record<string, string | undefined>>((acc, row: Record<string, unknown>) => {
    const key = row.key;
    const value = row.value;

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

export async function getAutoBackupRetentionSettings(): Promise<BackupRetentionSettings> {
  const values = await readRetentionSettingValues();

  return {
    enabled: values[BACKUP_RETENTION_SETTING_KEYS.enabled] === undefined
      ? DEFAULT_BACKUP_RETENTION_SETTINGS.enabled
      : values[BACKUP_RETENTION_SETTING_KEYS.enabled] === '1',
    maxFiles: normalizeMaxFiles(values[BACKUP_RETENTION_SETTING_KEYS.maxFiles]),
  };
}

export async function updateAutoBackupRetentionSettings(
  input: UpdateBackupRetentionSettingsInput
): Promise<BackupRetentionSettings> {
  const current = await getAutoBackupRetentionSettings();
  const next: BackupRetentionSettings = {
    enabled: input.enabled ?? current.enabled,
    maxFiles: input.maxFiles === undefined
      ? current.maxFiles
      : normalizeMaxFiles(input.maxFiles),
  };

  if (typeof input.enabled === 'boolean') {
    await upsertAppSetting(BACKUP_RETENTION_SETTING_KEYS.enabled, input.enabled ? '1' : '0');
  }

  if (typeof input.maxFiles === 'number') {
    await upsertAppSetting(BACKUP_RETENTION_SETTING_KEYS.maxFiles, String(next.maxFiles));
  }

  return next;
}

export async function cleanupOldAutoBackups(
  now = Date.now()
): Promise<BackupRetentionCleanupResult> {
  const settings = await getAutoBackupRetentionSettings();

  if (!settings.enabled) {
    return { skipped: true, deleted: 0, failed: 0 };
  }

  const activeAutoBackupFiles = await listActiveAutoBackupFiles();
  const oldFiles = [...activeAutoBackupFiles]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(settings.maxFiles);

  let deleted = 0;
  let failed = 0;

  for (const file of oldFiles) {
    try {
      const result = await documentSaver.deleteSavedFile({
        uri: file.uri ?? undefined,
        path: file.path ?? undefined,
      });

      if (result.deleted || result.missing) {
        await markBackupFileDeleted(file.id, now);
        deleted += 1;
      } else {
        failed += 1;
        logger.warn('Auto backup retention could not delete saved file.', {
          context: 'BackupRetentionService',
          metadata: { backup_file_id: file.id, file_name: file.fileName },
        });
      }
    } catch (error) {
      failed += 1;
      logger.warn('Auto backup retention delete failed.', error, {
        context: 'BackupRetentionService',
        metadata: { backup_file_id: file.id, file_name: file.fileName },
      });
    }
  }

  return { skipped: false, deleted, failed };
}
