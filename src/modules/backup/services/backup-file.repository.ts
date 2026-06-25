import { getDbConnection } from '@/core/db/sqlite/connection';
import { generateUUID } from '@/shared/utils/generate-uuid';
import type { BackupFileKind, BackupFileRecord } from '../domain/backup-file.model';

type BackupFileRow = {
  id?: unknown;
  file_name?: unknown;
  uri?: unknown;
  path?: unknown;
  kind?: unknown;
  platform?: unknown;
  encrypted?: unknown;
  created_at?: unknown;
  deleted_at?: unknown;
};

export interface RegisterBackupFileInput {
  fileName: string;
  uri?: string | null;
  path?: string | null;
  kind: BackupFileKind;
  platform: string;
  encrypted?: boolean;
  createdAt?: number;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function nullableNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}

function mapBackupFileRow(row: BackupFileRow): BackupFileRecord {
  return {
    id: String(row.id ?? ''),
    fileName: String(row.file_name ?? ''),
    uri: nullableString(row.uri),
    path: nullableString(row.path),
    kind: row.kind === 'manual' ? 'manual' : 'auto',
    platform: String(row.platform ?? ''),
    encrypted: Number(row.encrypted ?? 0) === 1,
    createdAt: Number(row.created_at ?? 0),
    deletedAt: nullableNumber(row.deleted_at),
  };
}

export async function registerBackupFile(
  input: RegisterBackupFileInput
): Promise<BackupFileRecord> {
  const db = await getDbConnection();
  const record: BackupFileRecord = {
    id: generateUUID(),
    fileName: input.fileName,
    uri: input.uri ?? null,
    path: input.path ?? null,
    kind: input.kind,
    platform: input.platform,
    encrypted: input.encrypted ?? false,
    createdAt: input.createdAt ?? Date.now(),
    deletedAt: null,
  };

  await db.run(
    `INSERT INTO backup_files (
      id, file_name, uri, path, kind, platform, encrypted, created_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.fileName,
      record.uri,
      record.path,
      record.kind,
      record.platform,
      record.encrypted ? 1 : 0,
      record.createdAt,
      record.deletedAt,
    ]
  );

  return record;
}

export async function listActiveAutoBackupFiles(): Promise<BackupFileRecord[]> {
  const db = await getDbConnection();
  const { values } = await db.query(
    `SELECT id, file_name, uri, path, kind, platform, encrypted, created_at, deleted_at
     FROM backup_files
     WHERE kind = ? AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    ['auto']
  );

  return (values ?? []).map((row: BackupFileRow) => mapBackupFileRow(row));
}

export async function markBackupFileDeleted(
  id: string,
  deletedAt: number
): Promise<void> {
  const db = await getDbConnection();
  await db.run(
    'UPDATE backup_files SET deleted_at = ? WHERE id = ?',
    [deletedAt, id]
  );
}

export const markBackupFileMissing = markBackupFileDeleted;
