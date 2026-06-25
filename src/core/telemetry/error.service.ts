import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';
import { errorLogRepository, readPendingErrorLogs, type ErrorLogRecord } from './error-log.repository';
import { logger, type StructuredLogEntry } from './logger';

export const APP_ERROR_TOAST_EVENT = 'app:error-toast';
export const DEFAULT_APP_ERROR_MESSAGE = 'Đã xảy ra lỗi. Vui lòng thử lại.';

const TOAST_SPAM_GUARD_MS = 1500;
const ERROR_LOG_EXPORT_MIME_TYPE = 'application/json';
let lastToastAt = 0;

export interface AppErrorContext {
  screen?: string;
  component?: string;
  action?: string;
  componentStack?: string;
  userMessage?: string;
  extra?: Record<string, unknown>;
}

export interface NotifyAppErrorOptions extends AppErrorContext {
  userMessage?: string;
}

interface NormalizedError {
  name: string | null;
  message: string | null;
  stack: string | null;
  value?: unknown;
}

function safeJsonValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (['string', 'number', 'boolean'].includes(typeof value)) return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    };
  }

  return {
    name: null,
    message: typeof error === 'string' ? error : null,
    stack: null,
    value: safeJsonValue(error),
  };
}

export function isShareCanceledError(error: unknown): boolean {
  const normalized = normalizeError(error);
  const errorObject =
    error !== null && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const candidates = [
    normalized.name,
    normalized.message,
    typeof errorObject?.name === 'string' ? errorObject.name : null,
    typeof errorObject?.message === 'string' ? errorObject.message : null,
    typeof errorObject?.code === 'string' ? errorObject.code : null,
    typeof normalized.value === 'string' ? normalized.value : null,
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase());

  return candidates.some((value) =>
    /\bshare\s+cancell?ed\b/.test(value) ||
    /\bcancell?ed\s+share\b/.test(value) ||
    /\buser\s+cancell?ed\b/.test(value)
  );
}

async function getAppVersion(): Promise<string | null> {
  if (Capacitor.getPlatform() === 'web') return null;

  try {
    const info = await CapacitorApp.getInfo();
    return info.version ?? null;
  } catch {
    return null;
  }
}

function pendingLogToRecord(entry: StructuredLogEntry, index: number): ErrorLogRecord {
  return {
    id: `pending_${entry.created_at}_${index}`,
    level: entry.level,
    message: entry.message,
    context: entry.context ?? null,
    stack: entry.stack ?? null,
    metadata_json: entry.metadata ? JSON.stringify(entry.metadata) : null,
    created_at: entry.created_at,
  };
}

function parseMetadata(metadataJson: string | null): Record<string, unknown> | null {
  if (!metadataJson) return null;

  try {
    const parsed = JSON.parse(metadataJson);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return { parseError: 'Invalid metadata_json', raw: metadataJson };
  }
}

function buildExportPayload(records: ErrorLogRecord[]) {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    count: records.length,
    logs: records.map((record) => ({
      id: record.id,
      timestamp: new Date(record.created_at).toISOString(),
      level: record.level,
      message: record.message,
      context: record.context,
      stack: record.stack,
      metadata: parseMetadata(record.metadata_json),
    })),
  };
}

function downloadInBrowser(fileName: string, content: string) {
  const blob = new Blob([content], { type: ERROR_LOG_EXPORT_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function notifyAppError(
  error: unknown,
  options: NotifyAppErrorOptions = {}
): Promise<void> {
  void error;
  const now = Date.now();
  if (now - lastToastAt < TOAST_SPAM_GUARD_MS) return;
  lastToastAt = now;

  const userMessage = options.userMessage || DEFAULT_APP_ERROR_MESSAGE;

  if (Capacitor.getPlatform() === 'android') {
    try {
      await Toast.show({ text: userMessage, duration: 'short' });
      return;
    } catch (toastError) {
      logger.warn('Native toast failed', toastError, { context: 'ErrorService.notifyAppError' });
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(APP_ERROR_TOAST_EVENT, {
        detail: { message: userMessage, type: 'error' },
      })
    );
  }
}

export async function logAppError(
  error: unknown,
  context: AppErrorContext = {}
): Promise<void> {
  const normalized = normalizeError(error);
  const userMessage = context.userMessage || DEFAULT_APP_ERROR_MESSAGE;
  const appVersion = await getAppVersion();

  logger.error(userMessage, error instanceof Error ? error : undefined, {
    context: [context.screen, context.component, context.action].filter(Boolean).join('.') || undefined,
    metadata: {
      timestamp: new Date().toISOString(),
      platform: Capacitor.getPlatform(),
      screen: context.screen,
      component: context.component,
      action: context.action,
      userMessage,
      errorName: normalized.name,
      errorMessage: normalized.message,
      stack: normalized.stack,
      componentStack: context.componentStack,
      appVersion,
      errorValue: normalized.value,
      extra: context.extra ? safeJsonValue(context.extra) : undefined,
    },
  });
}

export async function exportErrorLogs(): Promise<{ fileName: string; count: number }> {
  const persisted = await errorLogRepository.list(500);
  const pending = readPendingErrorLogs().map(pendingLogToRecord);
  const records = [...pending, ...persisted].sort((a, b) => b.created_at - a.created_at);
  const content = JSON.stringify(buildExportPayload(records), null, 2);
  const fileName = `error_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  if (Capacitor.getPlatform() === 'android') {
    const result = await Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    await Share.share({
      title: fileName,
      text: 'Error logs',
      url: result.uri,
      dialogTitle: 'Xuất log lỗi',
    });
  } else {
    downloadInBrowser(fileName, content);
  }

  return { fileName, count: records.length };
}

export async function clearErrorLogs(): Promise<void> {
  await errorLogRepository.clear();
}
