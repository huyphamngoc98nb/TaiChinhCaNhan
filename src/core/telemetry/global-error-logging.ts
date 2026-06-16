import {
  DEFAULT_APP_ERROR_MESSAGE,
  logAppError,
  notifyAppError,
} from './error.service';

let installed = false;

function toMetadataValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (['string', 'number', 'boolean'].includes(typeof value)) return value;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export function installGlobalErrorLogging() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    const error = event.error instanceof Error ? event.error : new Error(event.message);
    void notifyAppError(error, { userMessage: DEFAULT_APP_ERROR_MESSAGE });
    void logAppError(error, {
      action: 'window.error',
      userMessage: DEFAULT_APP_ERROR_MESSAGE,
      extra: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error instanceof Error ? undefined : toMetadataValue(event.error),
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const error = reason instanceof Error ? reason : new Error('Unhandled promise rejection');
    void notifyAppError(error, { userMessage: DEFAULT_APP_ERROR_MESSAGE });
    void logAppError(error, {
      action: 'window.unhandledrejection',
      userMessage: DEFAULT_APP_ERROR_MESSAGE,
      extra: {
        reason: reason instanceof Error ? undefined : toMetadataValue(reason),
      },
    });
  });
}
