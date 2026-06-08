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
import loanSkipTransactionSql from './025_loan_skip_transaction.sql?raw';
import loanLinkedTransactionSql from './026_loan_linked_transaction.sql?raw';

type DbConnection = Awaited<ReturnType<typeof getDbConnection>>;

type Migration = {
  version: number;
  name: string;
  sql: string;
};

type AppliedMigration = {
  version: number;
  name: string;
};

const LEGACY_LOAN_SKIP_TRANSACTION_NAME = '024_loan_skip_transaction';
const LEGACY_LOAN_LINKED_TRANSACTION_NAME = '025_loan_linked_transaction';
const LOAN_SKIP_TRANSACTION_NAME = '025_loan_skip_transaction';
const LOAN_LINKED_TRANSACTION_NAME = '026_loan_linked_transaction';

export const MIGRATIONS: Migration[] = [
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
  { version: 25, name: LOAN_SKIP_TRANSACTION_NAME,             sql: loanSkipTransactionSql },
  { version: 26, name: LOAN_LINKED_TRANSACTION_NAME,           sql: loanLinkedTransactionSql },
];

async function markMigrationDone(
  db: DbConnection,
  version: number,
  name: string,
) {
  await db.run(
    'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)',
    [version, name, Date.now()],
    false
  );
}

async function updateMigrationName(
  db: DbConnection,
  version: number,
  name: string,
) {
  await db.run(
    'UPDATE migrations SET name = ? WHERE version = ?',
    [name, version],
    false
  );
}

async function getAppliedMigrations(db: DbConnection): Promise<AppliedMigration[]> {
  const { values } = await db.query('SELECT version, name FROM migrations');
  return (values ?? []).map((row: any) => ({
    version: Number(row.version),
    name: typeof row.name === 'string' ? row.name : '',
  }));
}

function migrationNameAt(appliedMigrations: AppliedMigration[], version: number) {
  return appliedMigrations.find((migration) => migration.version === version)?.name;
}

async function tableExists(
  db: DbConnection,
  tableName: string,
) {
  if (!/^\w+$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  const { values } = await db.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
  return (values ?? []).length > 0;
}

async function columnExists(
  db: DbConnection,
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
  db: DbConnection,
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

    logger.error(`Migration statement failed: ${stmt.replace(/\s+/g, ' ').slice(0, 500)}`, err);
    throw err;
  }
}

async function runMigrationTransaction(
  db: DbConnection,
  isWeb: boolean,
  migrationName: string,
  fn: () => Promise<void>,
) {
  let transactionStarted = false;

  if (!isWeb) {
    const { result: isActive } = await db.isTransactionActive();
    if (!isActive) {
      await db.beginTransaction();
      transactionStarted = true;
    }
  }

  try {
    await fn();
    if (transactionStarted) await db.commitTransaction();
  } catch (err) {
    if (transactionStarted) {
      try { await db.rollbackTransaction(); }
      catch (re) { logger.warn(`Rollback failed for ${migrationName}:`, re); }
    }
    throw err;
  }
}

function buildLoanSkipTransactionSql(preserveLinkedTransactionId: boolean) {
  const linkedColumnDefinition = preserveLinkedTransactionId
    ? '  linked_transaction_id TEXT,\n'
    : '';
  const linkedInsertColumn = preserveLinkedTransactionId
    ? ', linked_transaction_id'
    : '';
  const linkedSelectColumn = preserveLinkedTransactionId
    ? ', linked_transaction_id'
    : '';

  return `
PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=ON;

ALTER TABLE loans ADD COLUMN skip_transaction INTEGER NOT NULL DEFAULT 0;

DROP TABLE IF EXISTS loans_new;

CREATE TABLE loans_new (
  id TEXT PRIMARY KEY,
  wallet_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('lend', 'borrow')),
  contact_name TEXT NOT NULL,
  contact_info TEXT,
  principal INTEGER NOT NULL CHECK (principal > 0),
  due_date TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  skip_transaction INTEGER NOT NULL DEFAULT 0 CHECK (skip_transaction IN (0, 1)),
${linkedColumnDefinition}  CHECK (skip_transaction = 1 OR wallet_id IS NOT NULL),
  FOREIGN KEY (wallet_id) REFERENCES wallets (id)
);

INSERT INTO loans_new (
  id, wallet_id, type, contact_name, contact_info, principal,
  due_date, note, status, created_at, updated_at, deleted_at, skip_transaction${linkedInsertColumn}
)
SELECT
  id, wallet_id, type, contact_name, contact_info, principal,
  due_date, note, status, created_at, updated_at, deleted_at, COALESCE(skip_transaction, 0)${linkedSelectColumn}
FROM loans;

DROP TABLE loans;
ALTER TABLE loans_new RENAME TO loans;

CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);

PRAGMA foreign_keys=ON;
`;
}

async function executeMigrationSql(
  db: DbConnection,
  sql: string,
) {
  const stmts = splitSqlStatements(sql);
  for (const stmt of stmts) {
    await executeMigrationStatement(db, stmt);
  }
  return stmts.length;
}

async function normalizeLegacyLoanMigrationNames(
  db: DbConnection,
  appliedMigrations: AppliedMigration[],
  canNormalizeLinkedAt25: boolean,
) {
  let changed = false;
  const version25Name = migrationNameAt(appliedMigrations, 25);
  const version26Name = migrationNameAt(appliedMigrations, 26);

  if (
    version25Name === LEGACY_LOAN_SKIP_TRANSACTION_NAME ||
    (canNormalizeLinkedAt25 && version25Name === LEGACY_LOAN_LINKED_TRANSACTION_NAME)
  ) {
    logger.warn(`Normalizing migration 25 name from ${version25Name} to ${LOAN_SKIP_TRANSACTION_NAME}.`);
    await updateMigrationName(db, 25, LOAN_SKIP_TRANSACTION_NAME);
    changed = true;
  }

  if (version26Name === LEGACY_LOAN_LINKED_TRANSACTION_NAME) {
    logger.warn(`Normalizing migration 26 name from ${version26Name} to ${LOAN_LINKED_TRANSACTION_NAME}.`);
    await updateMigrationName(db, 26, LOAN_LINKED_TRANSACTION_NAME);
    changed = true;
  }

  return changed;
}

async function repairLegacyLoanMigrationState(
  db: DbConnection,
  appliedMigrations: AppliedMigration[],
  isWeb: boolean,
) {
  let changed = false;
  let canNormalizeLinkedAt25 = false;
  const version25Name = migrationNameAt(appliedMigrations, 25);

  if (version25Name === LEGACY_LOAN_LINKED_TRANSACTION_NAME) {
    const hasLoansTable = await tableExists(db, 'loans');
    if (hasLoansTable) {
      const hasSkipTransaction = await columnExists(db, 'loans', 'skip_transaction');
      const hasLinkedTransaction = await columnExists(db, 'loans', 'linked_transaction_id');
      canNormalizeLinkedAt25 = true;

      if (!hasSkipTransaction) {
        logger.warn(
          `${LEGACY_LOAN_LINKED_TRANSACTION_NAME} was recorded at version 25 before ${LOAN_SKIP_TRANSACTION_NAME}. ` +
          `Repairing the missing loan skip-transaction schema.`
        );
        await runMigrationTransaction(db, isWeb, LOAN_SKIP_TRANSACTION_NAME, async () => {
          await executeMigrationSql(db, buildLoanSkipTransactionSql(hasLinkedTransaction));
        });
        changed = true;
      }
    }
  }

  if (await normalizeLegacyLoanMigrationNames(db, appliedMigrations, canNormalizeLinkedAt25)) {
    changed = true;
  }

  return changed;
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
  const isWeb = Capacitor.getPlatform() === 'web';

  await db.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at INTEGER NOT NULL
    )
  `);

  const migrationRows = await getAppliedMigrations(db);
  const repairedLegacyLoanState = await repairLegacyLoanMigrationState(db, migrationRows, isWeb);
  const appliedMigrations = repairedLegacyLoanState
    ? await getAppliedMigrations(db)
    : migrationRows;
  const appliedVersions = new Set(appliedMigrations.map((migration) => migration.version));

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
    const migrationSql = migration.version === 25 && await columnExists(db, 'loans', 'linked_transaction_id')
      ? buildLoanSkipTransactionSql(true)
      : migration.sql;
    const stmts = splitSqlStatements(migrationSql);

    try {
      await runMigrationTransaction(db, isWeb, migration.name, async () => {
        for (const stmt of stmts) {
          await executeMigrationStatement(db, stmt);
        }
        await markMigrationDone(db, migration.version, migration.name);
      });
      logger.info(`Migration ${migration.name} completed (${stmts.length} stmts).`);
    } catch (err: any) {
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
