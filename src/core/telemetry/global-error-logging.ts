import { logger } from './logger';

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
    logger.error(
      'Unhandled window error',
      event.error instanceof Error ? event.error : undefined,
      {
        context: 'window.error',
        metadata: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error instanceof Error ? undefined : toMetadataValue(event.error),
        },
      }
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    logger.error(
      'Unhandled promise rejection',
      reason instanceof Error ? reason : undefined,
      {
        context: 'window.unhandledrejection',
        metadata: {
          reason: reason instanceof Error ? undefined : toMetadataValue(reason),
        },
      }
    );
  });
}
