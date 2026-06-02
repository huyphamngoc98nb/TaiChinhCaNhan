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

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}
