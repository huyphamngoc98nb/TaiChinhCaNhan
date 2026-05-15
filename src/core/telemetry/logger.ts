import { ENV } from '@/shared/config/env';
import { errorLogRepository } from './error-log.repository';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  created_at: number;
}

interface LogOptions {
  context?: string;
  metadata?: Record<string, unknown>;
}

function isLogOptions(value: unknown): value is LogOptions {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeError(error: unknown): { stack?: string; metadata?: Record<string, unknown> } {
  if (error instanceof Error) {
    return {
      stack: error.stack,
      metadata: {
        error_name: error.name,
        error_message: error.message,
      },
    };
  }

  if (error === undefined) return {};

  return {
    metadata: {
      value: typeof error === 'string' ? error : JSON.stringify(error),
    },
  };
}

class Logger {
  private persist(entry: StructuredLogEntry) {
    if (entry.level !== 'error' && entry.level !== 'warn') return;

    void errorLogRepository.append(entry).catch((error) => {
      console.warn('[LOGGER] Failed to persist log entry', error);
    });
  }

  private log(level: LogLevel, message: string, ...optionalParams: unknown[]) {
    if (ENV.isProd && level === 'debug') {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    const maybeError = optionalParams.find((param) => param instanceof Error);
    const maybeOptions = optionalParams.find(isLogOptions);
    const normalizedError = normalizeError(maybeError);

    const entry: StructuredLogEntry = {
      level,
      message,
      context: maybeOptions?.context,
      stack: normalizedError.stack,
      metadata: {
        ...normalizedError.metadata,
        ...maybeOptions?.metadata,
      },
      created_at: Date.now(),
    };

    switch (level) {
      case 'info':
        console.info(prefix, message, ...optionalParams);
        break;
      case 'warn':
        console.warn(prefix, message, ...optionalParams);
        break;
      case 'error':
        console.error(prefix, message, ...optionalParams);
        break;
      case 'debug':
        console.debug(prefix, message, ...optionalParams);
        break;
    }

    this.persist(entry);
  }

  info(message: string, ...optionalParams: unknown[]) {
    this.log('info', message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: unknown[]) {
    this.log('warn', message, ...optionalParams);
  }

  error(message: string, ...optionalParams: unknown[]) {
    this.log('error', message, ...optionalParams);
  }

  debug(message: string, ...optionalParams: unknown[]) {
    this.log('debug', message, ...optionalParams);
  }
}

export const logger = new Logger();
