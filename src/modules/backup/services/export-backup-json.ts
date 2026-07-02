import { getDbConnection } from '@/core/db/sqlite/connection';
import { BackupPayload, BackupRow } from '../domain/backup.model';

export const CURRENT_BACKUP_VERSION = '2.0';
export const CURRENT_SCHEMA_VERSION = 16;

export async function exportBackupJson(): Promise<BackupPayload> {
  const db = await getDbConnection();

  const tables = [
    'wallets',
    'categories',
    'transactions',
    'recurring_bills',
    'app_settings',
    'budgets',
    'error_logs',
    'loans',
    'loan_payments',
  ];
  const data: Record<string, BackupRow[]> = {};

  for (const table of tables) {
    const query = table === 'transactions'
      ? `SELECT
          id, wallet_id, category_id, type, amount, note, transaction_date,
          to_wallet_id, exclude_from_total, is_budget_offset, offset_budget_id,
          source_type, source_id, source_event, created_at, updated_at, deleted_at
        FROM transactions`
      : `SELECT * FROM ${table}`;
    const { values } = await db.query(query);
    data[table] = (values || []) as BackupRow[];
  }

  const payload: BackupPayload = {
    metadata: {
      version: CURRENT_BACKUP_VERSION,
      schema_version: CURRENT_SCHEMA_VERSION,
      exported_at: Date.now(),
      app_version: '0.1.0',
      app_name: 'TaiXiuCaNhan',
    },
    wallets: data.wallets,
    categories: data.categories,
    transactions: data.transactions,
    recurring_bills: data.recurring_bills,
    app_settings: data.app_settings,
    budgets: data.budgets,
    error_logs: data.error_logs,
    loans: data.loans,
    loan_payments: data.loan_payments,
  };

  return payload;
}
