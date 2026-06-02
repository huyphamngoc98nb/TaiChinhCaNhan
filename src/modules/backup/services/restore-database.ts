import { getDbConnection } from '@/core/db/sqlite/connection';
import { BackupPayload, BackupRow } from '../domain/backup.model';
import { logger } from '@/core/telemetry/logger';

interface LegacyRestorableBackupPayload {
  metadata: {
    version: string;
    schema_version?: number;
    exported_at: number;
    app_version: string;
  };
  wallets: BackupRow[];
  categories: BackupRow[];
  transactions: BackupRow[];
  recurring_bills: BackupRow[];
  app_settings: BackupRow[];
  budgets?: BackupRow[];
  error_logs?: BackupRow[];
  loans?: BackupRow[];
  loan_payments?: BackupRow[];
}

type RestorableBackupPayload = BackupPayload | LegacyRestorableBackupPayload;

function value(row: BackupRow, key: string, fallback: unknown = null): unknown {
  return row[key] ?? fallback;
}

export async function restoreDatabase(payload: RestorableBackupPayload): Promise<void> {
  const db = await getDbConnection();
  
  try {
    logger.info('Starting database restore...');
    
    // 1. Prepare deletion statements
    const tables = [
      'loan_payments',
      'loans',
      'transactions',
      'recurring_bills',
      'budgets',
      'categories',
      'wallets',
      'app_settings',
      'error_logs',
    ];
    const deleteStatements = tables.map(table => ({
      statement: `DELETE FROM ${table}`,
      values: []
    }));

    // 2. Prepare insertion statements
    const insertStatements: any[] = [];

    // Order matters for foreign keys: wallets -> categories -> transactions -> recurring_bills
    
    // Wallets
    payload.wallets.forEach((row) => {
      insertStatements.push({
        statement: `INSERT INTO wallets (
          id, name, currency, balance, account_type, icon, color, sort_order,
          is_active, exclude_from_total, credit_limit, statement_day, due_day,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          row.id,
          row.name,
          value(row, 'currency', 'VND'),
          row.balance,
          value(row, 'account_type', value(row, 'type', 'cash')),
          value(row, 'icon'),
          value(row, 'color'),
          value(row, 'sort_order', 0),
          value(row, 'is_active', 1),
          value(row, 'exclude_from_total', 0),
          value(row, 'credit_limit'),
          value(row, 'statement_day'),
          value(row, 'due_day'),
          row.created_at,
          row.updated_at,
        ]
      });
    });

    // Categories
    payload.categories.forEach((row) => {
      insertStatements.push({
        statement: `INSERT INTO categories (id, name, type, icon, color, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [row.id, row.name, row.type, value(row, 'icon'), value(row, 'color'), value(row, 'description'), row.created_at, row.updated_at]
      });
    });

    // Budgets
    (payload.budgets ?? []).forEach((row) => {
      insertStatements.push({
        statement: `INSERT INTO budgets (
          id, category_id, wallet_id, account_type_scope, amount, period,
          start_date, end_date, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          row.id,
          row.category_id,
          value(row, 'wallet_id'),
          value(row, 'account_type_scope'),
          row.amount,
          row.period,
          row.start_date,
          value(row, 'end_date'),
          value(row, 'is_active', 1),
          row.created_at,
          row.updated_at,
        ]
      });
    });

    // Loans
    (payload.loans ?? []).forEach((row) => {
      insertStatements.push({
        statement: `INSERT INTO loans (
          id, wallet_id, type, contact_name, contact_info, principal,
          due_date, note, status, created_at, updated_at, deleted_at, skip_transaction
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          row.id,
          value(row, 'wallet_id'),
          row.type,
          row.contact_name,
          value(row, 'contact_info'),
          row.principal,
          value(row, 'due_date'),
          value(row, 'note'),
          value(row, 'status', 'active'),
          row.created_at,
          row.updated_at,
          value(row, 'deleted_at'),
          value(row, 'skip_transaction', 0),
        ],
      });
    });

    // Loan Payments
    (payload.loan_payments ?? []).forEach((row) => {
      insertStatements.push({
        statement: `INSERT INTO loan_payments (
          id, loan_id, wallet_id, amount, payment_date, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        values: [
          row.id,
          row.loan_id,
          row.wallet_id,
          row.amount,
          row.payment_date,
          value(row, 'note'),
          row.created_at,
        ],
      });
    });

    // Transactions
    payload.transactions.forEach((row) => {
      insertStatements.push({
        statement: `INSERT INTO transactions (
          id, wallet_id, category_id, type, amount, note, receipt_path,
          transaction_date, to_wallet_id, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          row.id,
          row.wallet_id,
          row.category_id,
          row.type,
          row.amount,
          value(row, 'note'),
          value(row, 'receipt_path'),
          row.transaction_date,
          value(row, 'to_wallet_id'),
          row.created_at,
          row.updated_at,
          value(row, 'deleted_at'),
        ]
      });
    });

    // Recurring Bills
    payload.recurring_bills.forEach((row) => {
      insertStatements.push({
        statement: `INSERT INTO recurring_bills (id, wallet_id, category_id, name, amount, frequency, next_due_date, reminder_days, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          row.id,
          row.wallet_id,
          row.category_id,
          row.name,
          row.amount,
          row.frequency,
          row.next_due_date,
          value(row, 'reminder_days', 3),
          value(row, 'is_active', 1),
          row.created_at,
          row.updated_at,
        ]
      });
    });

    // App Settings
    payload.app_settings.forEach((row) => {
      insertStatements.push({
        statement: `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
        values: [row.key, row.value, row.updated_at]
      });
    });

    // Error Logs
    (payload.error_logs ?? []).forEach((row) => {
      insertStatements.push({
        statement: `INSERT INTO error_logs (id, level, message, context, stack, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        values: [
          row.id,
          row.level,
          row.message,
          value(row, 'context'),
          value(row, 'stack'),
          value(row, 'metadata_json'),
          row.created_at,
        ],
      });
    });

    // 3. Execute all in a single batch (Capacitor SQLite executeSet uses a transaction internally)
    const set = [...deleteStatements, ...insertStatements];
    
    // We should disable foreign keys during wipe-and-reload to avoid constraint errors during the transition
    await db.run('PRAGMA foreign_keys = OFF');
    
    const result = await db.executeSet(set);
    
    if (result.changes && (result.changes.changes ?? 0) < 0) {
      throw new Error('Database restore failed: Batch execution returned error status.');
    }

    await db.run('PRAGMA foreign_keys = ON');

    // On web, we must save to store
    const isWeb = (await import('@capacitor/core')).Capacitor.getPlatform() === 'web';
    if (isWeb) {
      const { DB_NAME } = await import('@/core/db/sqlite/connection');
      await (await import('@/core/db/sqlite/pragmas')).sqlite.saveToStore(DB_NAME);
    }

    logger.info('Database restore completed successfully.');
  } catch (error) {
    logger.error('Failed to restore database', error);
    // Ensure foreign keys are back on even if we fail
    await db.run('PRAGMA foreign_keys = ON');
    throw error;
  }
}
