import { BackupPayload, BackupPreview } from '../domain/backup.model';
import { normalizeBackupPayload } from './validate-backup-payload';
import { restoreDatabase } from './restore-database';
import { decryptBackupEnvelope, isEncryptedBackupEnvelope } from './encrypted-backup';
import { translations, type TranslationPath } from '@/shared/constants/translations';

function defaultText(path: TranslationPath): string {
  const keys = path.split('.');
  let current: unknown = translations.vi;

  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : path;
}

export class EncryptedBackupPasswordRequiredError extends Error {
  constructor() {
    super(defaultText('backup.password_required'));
    this.name = 'EncryptedBackupPasswordRequiredError';
  }
}

async function readBackupFile(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    try {
      return await file.text();
    } catch {
      // Some Android WebView file providers expose a File but fail through
      // Blob.text(). Fall back to FileReader, which can handle other providers.
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        reject(new Error(defaultText('backup.file_read_failed')));
        return;
      }
      resolve(text);
    };

    reader.onerror = () => reject(new Error(defaultText('backup.file_read_failed')));
    reader.readAsText(file, 'UTF-8');
  });
}

export class InvalidBackupFileError extends Error {
  constructor(message = defaultText('backup.invalid_file')) {
    super(message);
    this.name = 'InvalidBackupFileError';
  }
}

function parseBackupText(text: string): unknown {
  if (!text.trim()) {
    throw new InvalidBackupFileError(defaultText('backup.empty_file'));
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidBackupFileError(defaultText('backup.invalid_file'));
  }
}

function buildPreview(payload: BackupPayload, encrypted: boolean): BackupPreview {
  return {
    metadata: payload.metadata,
    encrypted,
    counts: {
      wallets: payload.wallets.length,
      transactions: payload.transactions.length,
      categories: payload.categories.length,
      budgets: payload.budgets.length,
      recurring_bills: payload.recurring_bills.length,
      loans: payload.loans.length,
      loan_payments: payload.loan_payments.length,
      app_settings: payload.app_settings.length,
      error_logs: payload.error_logs.length,
    },
  };
}

export interface PreparedBackupImport {
  payload: BackupPayload;
  preview: BackupPreview;
}

export async function prepareBackupImport(file: File, password?: string): Promise<PreparedBackupImport> {
  const text = await readBackupFile(file);
  let payload: unknown = parseBackupText(text);
  let encrypted = false;

  if (isEncryptedBackupEnvelope(payload)) {
    if (!password) throw new EncryptedBackupPasswordRequiredError();
    payload = await decryptBackupEnvelope(payload, password);
    encrypted = true;
  }

  const normalized = normalizeBackupPayload(payload);
  return {
    payload: normalized,
    preview: buildPreview(normalized, encrypted),
  };
}

export async function importPreparedBackup(prepared: PreparedBackupImport): Promise<void> {
  await restoreDatabase(prepared.payload);
}

export async function importBackupJson(file: File, password?: string): Promise<void> {
  const prepared = await prepareBackupImport(file, password);
  await importPreparedBackup(prepared);
}
