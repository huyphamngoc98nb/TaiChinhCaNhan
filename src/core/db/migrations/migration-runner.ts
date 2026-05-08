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

const MIGRATIONS = [
  { version: 1,  name: '001_init',                       sql: initSql },
  { version: 2,  name: '002_indexes',                    sql: indexesSql },
  { version: 3,  name: '003_transactions_soft_delete',   sql: softDeleteSql },
  { version: 4,  name: '004_transactions_receipt_path',  sql: receiptPathSql },
  { version: 5,  name: '005_category_budgets',           sql: categoryBudgetsSql },
  { version: 6,  name: '006_recurring_bills_reminder',   sql: recurringBillsReminderSql },
  { version: 7,  name: '007_transactions_transfer_wallet', sql: transferWalletSql },
  { version: 8,  name: '008_wallet_balance_triggers',    sql: balanceTriggersSql },
  { version: 9,  name: '009_recurring_bills_delete_fix', sql: rbDeleteFixSql },
  { version: 10, name: '010_drop_balance_triggers',      sql: dropBalanceTriggersSql },
];

/**
 * Split a migration SQL file into individual executable statements.
 *
 * Problem: @capacitor-community/sqlite on Android cannot handle a string
 * containing multiple statements when one of them is a CREATE TRIGGER
 * with BEGIN...END body (the plugin splits on ';' and sends an incomplete
 * fragment to SQLite, causing "Execute: incomplete input").
 *
 * Strategy:
 * 1. Strip SQL comments (-- line comments).
 * 2. Detect trigger blocks: everything from CREATE TRIGGER ... to the
 *    matching standalone END; is kept as one unit.
 * 3. All remaining statements are split on ';' as usual.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  // Normalize line endings
  let remaining = sql.replace(/\r\n/g, '\n');

  while (remaining.trim().length > 0) {
    // Skip leading whitespace / comments
    remaining = remaining.replace(/^(\s*--[^\n]*\n|\s+)/, '');
    if (!remaining.trim()) break;

    // Detect start of a CREATE TRIGGER block
    if (/^CREATE\s+(TEMP\s+|TEMPORARY\s+)?TRIGGER/i.test(remaining.trim())) {
      // Find the END; that closes this trigger (case-insensitive, standalone line)
      const endMatch = remaining.match(/\bEND\s*;/i);
      if (endMatch && endMatch.index !== undefined) {
        const triggerSql = remaining.slice(0, endMatch.index + endMatch[0].length).trim();
        statements.push(triggerSql);
        remaining = remaining.slice(endMatch.index + endMatch[0].length);
      } else {
        // Malformed trigger — push the rest and break
        statements.push(remaining.trim());
        break;
      }
    } else {
      // Regular statement: take up to the next ;
      const semiIdx = remaining.indexOf(';');
      if (semiIdx === -1) {
        const trimmed = remaining.trim();
        if (trimmed) statements.push(trimmed);
        break;
      }
      const stmt = remaining.slice(0, semiIdx + 1).trim();
      remaining = remaining.slice(semiIdx + 1);
      // Skip empty or comment-only fragments
      const contentOnly = stmt.replace(/--[^\n]*/g, '').trim();
      if (contentOnly && contentOnly !== ';') {
        statements.push(stmt);
      }
    }
  }

  return statements;
}

export async function runMigrations() {
  const db = await getDbConnection();

  // Create migrations tracking table if not exists
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

    logger.info(`Running migration: ${migration.name}`);

    // Split into individual statements so triggers are never split on ';'
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
        // Each statement is sent individually — safe for multi-line trigger bodies
        await db.execute(stmt, false);
      }

      await db.run(
        'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)',
        [migration.version, migration.name, Date.now()],
        false
      );

      if (transactionStarted) await db.commitTransaction();
      logger.info(`Migration ${migration.name} completed (${stmts.length} statements).`);
    } catch (err: any) {
      if (transactionStarted) {
        try {
          await db.rollbackTransaction();
        } catch (rollbackErr) {
          logger.warn(`Rollback for ${migration.name} failed:`, rollbackErr);
        }
      }

      const errorMessage = err.message || '';
      const isDuplicateError =
        errorMessage.includes('already exists') ||
        errorMessage.includes('duplicate column');

      if (isWeb && isDuplicateError) {
        // Partially applied on web — mark as done and continue
        logger.warn(`Migration ${migration.name} partially applied on web. Marking as executed.`);
        try {
          await db.run(
            'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)',
            [migration.version, migration.name, Date.now()],
            false
          );
        } catch (insertErr) {
          logger.error(`Failed to mark ${migration.name} as done.`, insertErr);
        }
      } else {
        logger.error(`Migration ${migration.name} failed.`, err);
        throw err; // Surface to UI so user sees actionable error
      }
    }
  }
}
