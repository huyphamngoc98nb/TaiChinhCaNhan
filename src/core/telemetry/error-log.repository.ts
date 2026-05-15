import { getDbConnection, isDatabaseReady } from '@/core/db/sqlite/connection';
import type { LogLevel, StructuredLogEntry } from './logger';

export interface ErrorLogRecord {
  id: string;
  level: LogLevel;
  message: string;
  context: string | null;
  stack: string | null;
  metadata_json: string | null;
  created_at: number;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class ErrorLogRepository {
  async append(entry: StructuredLogEntry): Promise<void> {
    if (!(await isDatabaseReady())) return;

    const db = await getDbConnection();
    await db.run(
      `INSERT INTO error_logs
        (id, level, message, context, stack, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        entry.level,
        entry.message,
        entry.context ?? null,
        entry.stack ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.created_at,
      ]
    );
  }

  async list(limit = 200): Promise<ErrorLogRecord[]> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT id, level, message, context, stack, metadata_json, created_at
       FROM error_logs
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit]
    );
    return (values ?? []) as ErrorLogRecord[];
  }
}

export const errorLogRepository = new ErrorLogRepository();
