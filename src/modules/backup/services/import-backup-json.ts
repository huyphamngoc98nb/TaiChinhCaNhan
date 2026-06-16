import { BackupPayload, BackupPreview } from '../domain/backup.model';
import { normalizeBackupPayload } from './validate-backup-payload';
import { restoreDatabase } from './restore-database';
import { decryptBackupEnvelope, isEncryptedBackupEnvelope } from './encrypted-backup';

export class EncryptedBackupPasswordRequiredError extends Error {
  constructor() {
    super('Backup password is required');
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
        reject(new Error('Backup file could not be read as text'));
        return;
      }
      resolve(text);
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'UTF-8');
  });
}

export class InvalidBackupFileError extends Error {
  constructor(message = 'File không đúng định dạng backup.') {
    super(message);
    this.name = 'InvalidBackupFileError';
  }
}

function parseBackupText(text: string): unknown {
  if (!text.trim()) {
    throw new InvalidBackupFileError('File backup rỗng.');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidBackupFileError('File không đúng định dạng backup.');
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
