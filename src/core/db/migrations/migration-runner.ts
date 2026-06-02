import { Capacitor } from '@capacitor/core';
import { getDbConnection } from '../sqlite/connection';
import { logger } from '@/core/telemetry/logger';

import initSql from './001_init.sql?raw';
import indexesSql from './002_indexes.sql?raw';
import softDeleteSql from './003_transactions_soft_delete.sql?raw';
import receiptPathSql from './004_transactions_receipt_path.sql?raw';
import categoryBudgetsSql from './005_category_budgets.sql?raw';
import recurringBillsReminderSql from './006_recurring_bills_reminder.sql?raw';
import transferWalletSql from './007_transactions_transfer_wallet.sql?raw';
import balanceTriggersSql from './008_wallet_balance_triggers.sql?raw';
import rbDeleteFixSql from './009_recurring_bills_delete_fix.sql?raw';
import dropBalanceTriggersSql from './010_drop_balance_triggers.sql?raw';
import dropTransferCheckTriggersSql from './011_drop_transfer_check_triggers.sql?raw';
import separateBudgetsSql from './012_separate_budgets.sql?raw';
import enhanceWalletsSql from './013_enhance_wallets.sql?raw';
import walletAccountTypeExtrasSql from './014_wallet_account_type_extras.sql?raw';
import budgetAccountTypeSql from './015_budget_account_type_scope.sql?raw';
import errorLogsSql from './016_error_logs.sql?raw';
import budgetSingleActiveScopeSql from './017_budget_single_active_scope.sql?raw';
import budgetSingleActiveCategorySql from './018_budget_single_active_category.sql?raw';
import transferCategorySql from './019_transfer_category.sql?raw';
import categoryDescriptionSql from './020_category_description.sql?raw';
import removeUnusedSeedWalletsSql from './021_remove_unused_seed_wallets.sql?raw';
import creditCardStatementsSql from './022_credit_card_statements.sql?raw';
import loansSql from './023_loans.sql?raw';
import loanCategoriesSql from './024_loan_categories.sql?raw';
import loanSkipTransactionSql from './024_loan_skip_transaction.sql?raw';
import loanLinkedTransactionSql from './025_loan_linked_transaction.sql?raw';

const MIGRATIONS = [
  { version: 1,  name: '001_init',                          sql: initSql },
  { version: 2,  name: '002_indexes',                       sql: indexesSql },
  { version: 3,  name: '003_transactions_soft_delete',      sql: softDeleteSql },
  { version: 4,  name: '004_transactions_receipt_path',     sql: receiptPathSql },
  { version: 5,  name: '005_category_budgets',              sql: categoryBudgetsSql },
  { version: 6,  name: '006_recurring_bills_reminder',      sql: recurringBillsReminderSql },
  { version: 7,  name: '007_transactions_transfer_wallet',  sql: transferWalletSql },
  { version: 8,  name: '008_wallet_balance_triggers',       sql: balanceTriggersSql },
  { version: 9,  name: '009_recurring_bills_delete_fix',    sql: rbDeleteFixSql },
  { version: 10, name: '010_drop_balance_triggers',         sql: dropBalanceTriggersSql },
  { version: 11, name: '011_drop_transfer_check_triggers',  sql: dropTransferCheckTriggersSql },
  { version: 12, name: '012_separate_budgets',              sql: separateBudgetsSql },
  { version: 13, name: '013_enhance_wallets',               sql: enhanceWalletsSql },
  { version: 14, name: '014_wallet_account_type_extras',    sql: walletAccountTypeExtrasSql },
  { version: 15, name: '015_budget_account_type_scope',     sql: budgetAccountTypeSql },
  { version: 16, name: '016_error_logs',                    sql: errorLogsSql },
  { version: 17, name: '017_budget_single_active_scope',     sql: budgetSingleActiveScopeSql },
  { version: 18, name: '018_budget_single_active_category',  sql: budgetSingleActiveCategorySql },
  { version: 19, name: '019_transfer_category',              sql: transferCategorySql },
  { version: 20, name: '020_category_description',            sql: categoryDescriptionSql },
  { version: 21, name: '021_remove_unused_seed_wallets',       sql: removeUnusedSeedWalletsSql },
  { version: 22, name: '022_credit_card_statements',           sql: creditCardStatementsSql },
  { version: 23, name: '023_loans',                            sql: loansSql },
  { version: 24, name: '024_loan_categories',                  sql: loanCategoriesSql },
  { version: 25, name: '024_loan_skip_transaction',            sql: loanSkipTransactionSql },
  { version: 26, name: '025_loan_linked_transaction',          sql: loanLinkedTransactionSql },
];

async function markMigrationDone(
  db: Awaited<ReturnType<typeof getDbConnection>>,
  version: number,
  name: string,
) {
  await db.run(
    'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)',
    [version, name, Date.now()],
    false
  );
}

async function columnExists(
  db: Awaited<ReturnType<typeof getDbConnection>>,
  tableName: string,
  columnName: string,
) {
  const { values } = await db.query(`PRAGMA table_info(${tableName})`);
  return (values ?? []).some((row: any) => row.name === columnName);
}

function parseAddColumnStatement(stmt: string): { tableName: string; columnName: string } | null {
  const match = stmt.match(/^\s*ALTER\s+TABLE\s+["`[]?(\w+)["`\]]?\s+ADD\s+COLUMN\s+["`[]?(\w+)["`\]]?/i);
  if (!match) return null;
  return { tableName: match[1], columnName: match[2] };
}

async function executeMigrationStatement(
  db: Awaited<ReturnType<typeof getDbConnection>>,
  stmt: string,
) {
  try {
    await db.execute(stmt, false);
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    const addColumn = parseAddColumnStatement(stmt);

    if (
      addColumn &&
      msg.toLowerCase().includes('duplicate column') &&
      await columnExists(db, addColumn.tableName, addColumn.columnName)
    ) {
      logger.warn(`Column ${addColumn.tableName}.${addColumn.columnName} already exists. Skipping migration statement.`);
      return;
    }

    throw err;
  }
}

/**
 * Split a SQL migration file into individual executable statements.
 * Splits on ';' for regular statements.
 * Trigger blocks (BEGIN...END) are extracted as a single unit via depth-counting
 * as a safety net (no trigger files remain, but kept for future safety).
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let remaining = sql.replace(/\r\n/g, '\n');

  while (remaining.trim().length > 0) {
    remaining = remaining.replace(/^(?:\s*--[^\n]*\n|\s+)+/, '');
    if (!remaining.trim()) break;

    const trimmed = remaining.trimStart();

    if (/^CREATE\s+(TEMP\s+|TEMPORARY\s+)?TRIGGER/i.test(trimmed)) {
      let depth = 0;
      let i = 0;
      let inStr = false;
      let strChar = '';
      let found = false;
      while (i < remaining.length) {
        const ch = remaining[i];
        if (inStr) {
          if (ch === strChar) inStr = false;
        } else {
          if (ch === "'" || ch === '"') { inStr = true; strChar = ch; }
          else if (/^BEGIN\b/i.test(remaining.slice(i))) { depth++; }
          else if (/^END\b/i.test(remaining.slice(i))) {
            depth--;
            if (depth === 0) {
              const semiIdx = remaining.indexOf(';', i);
              const end = semiIdx === -1 ? remaining.length : semiIdx + 1;
              statements.push(remaining.slice(0, end).trim());
              remaining = remaining.slice(end);
              found = true;
              break;
            }
          }
        }
        i++;
      }
      if (!found) {
        statements.push(remaining.trim());
        break;
      }
    } else {
      const semiIdx = remaining.indexOf(';');
      if (semiIdx === -1) {
        const t = remaining.trim();
        if (t) statements.push(t);
        break;
      }
      const stmt = remaining.slice(0, semiIdx + 1).trim();
      remaining = remaining.slice(semiIdx + 1);
      const content = stmt.replace(/--[^\n]*/g, '').trim();
      if (content && content !== ';') statements.push(stmt);
    }
  }

  return statements;
}

export async function runMigrations() {
  const db = await getDbConnection();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at INTEGER NOT NULL
    )
  `);

  const { values } = await db.query('SELECT version FROM migrations');
  const appliedVersions = new Set(values?.map((v: any) => v.version) || []);
  const isWeb = Capacitor.getPlatform() === 'web';

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    if (
      migration.version === 20 &&
      await columnExists(db, 'categories', 'description')
    ) {
      logger.warn(`${migration.name} column already exists. Marking done.`);
      await markMigrationDone(db, migration.version, migration.name);
      continue;
    }

    logger.info(`Running migration: ${migration.name}`);
    const stmts = splitSqlStatements(migration.sql);
    let transactionStarted = false;

    if (!isWeb) {
      const { result: isActive } = await db.isTransactionActive();
      if (!isActive) {
        await db.beginTransaction();
        transactionStarted = true;
      }
    }

    try {
      for (const stmt of stmts) {
        await executeMigrationStatement(db, stmt);
      }
      await markMigrationDone(db, migration.version, migration.name);
      if (transactionStarted) await db.commitTransaction();
      logger.info(`Migration ${migration.name} completed (${stmts.length} stmts).`);
    } catch (err: any) {
      if (transactionStarted) {
        try { await db.rollbackTransaction(); }
        catch (re) { logger.warn(`Rollback failed for ${migration.name}:`, re); }
      }
      const msg = err.message || '';
      const isDupe = msg.includes('already exists') || msg.includes('duplicate column');
      if (isWeb && isDupe) {
        logger.warn(`${migration.name} partially applied on web. Marking done.`);
        try {
          await markMigrationDone(db, migration.version, migration.name);
        } catch (ie) { logger.error(`Failed to mark ${migration.name} done.`, ie); }
      } else {
        logger.error(`Migration ${migration.name} failed.`, err);
        throw err;
      }
    }
  }
}
