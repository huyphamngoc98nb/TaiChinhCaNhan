export interface BackupMetadata {
  version: string;
  schema_version: number;
  exported_at: number;
  app_version: string;
}

export type BackupRow = Record<string, unknown>;

export interface BackupPayload {
  metadata: BackupMetadata;
  wallets: BackupRow[];
  categories: BackupRow[];
  transactions: BackupRow[];
  recurring_bills: BackupRow[];
  app_settings: BackupRow[];
  budgets: BackupRow[];
  error_logs: BackupRow[];
  loans: BackupRow[];
  loan_payments: BackupRow[];
}

export interface EncryptedBackupEnvelope {
  metadata: BackupMetadata;
  encryption: {
    format: 'expense-tracker-encrypted-backup';
    version: 1;
    algorithm: 'AES-GCM';
    kdf: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string;
    iv: string;
  };
  ciphertext: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}
