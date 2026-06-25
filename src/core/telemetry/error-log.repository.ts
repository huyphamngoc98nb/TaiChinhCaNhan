import { getDbConnection, isDatabaseReady } from '@/core/db/sqlite/connection';
import type { LogLevel, StructuredLogEntry } from './logger';

const PENDING_LOGS_KEY = 'tai_xiu_pending_error_logs';

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

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readPendingLogs(): StructuredLogEntry[] {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(PENDING_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingLogs(entries: StructuredLogEntry[]) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(entries.slice(-100)));
}

export function readPendingErrorLogs(): StructuredLogEntry[] {
  return readPendingLogs();
}

function appendPendingLog(entry: StructuredLogEntry) {
  writePendingLogs([...readPendingLogs(), entry]);
}

export class ErrorLogRepository {
  private async insert(entry: StructuredLogEntry): Promise<void> {
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

  private async flushPending(): Promise<void> {
    const pending = readPendingLogs();
    if (pending.length === 0) return;

    for (const entry of pending) {
      await this.insert(entry);
    }
    writePendingLogs([]);
  }

  async append(entry: StructuredLogEntry): Promise<void> {
    if (!(await isDatabaseReady())) {
      appendPendingLog(entry);
      return;
    }

    try {
      await this.flushPending();
      await this.insert(entry);
    } catch (error) {
      appendPendingLog(entry);
      throw error;
    }
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

  async clear(): Promise<void> {
    writePendingLogs([]);

    if (!(await isDatabaseReady())) {
      return;
    }

    const db = await getDbConnection();
    await db.run('DELETE FROM error_logs');
  }
}

export const errorLogRepository = new ErrorLogRepository();
