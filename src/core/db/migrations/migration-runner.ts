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
];

/**
 * Split a SQL migration file into individual executable statements.
 *
 * Avoids the @capacitor-community/sqlite Android bug where a multi-statement
 * string containing CREATE TRIGGER BEGIN...END causes "incomplete input".
 *
 * NOTE: After removing all triggers from migration files, this splitter
 * only needs to handle plain DDL/DML statements (split on ';').
 * The trigger-aware path is kept as a safety net but should never trigger.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let remaining = sql.replace(/\r\n/g, '\n');

  while (remaining.trim().length > 0) {
    // Skip leading whitespace and line comments
    remaining = remaining.replace(/^(\s*--[^\n]*\n|\s+)/, '');
    if (!remaining.trim()) break;

    const trimmed = remaining.trimStart();

    if (/^CREATE\s+(TEMP\s+|TEMPORARY\s+)?TRIGGER/i.test(trimmed)) {
      // Safety net: extract trigger block by counting BEGIN/END depth
      let depth = 0;
      let i = 0;
      let inStr = false;
      let strChar = '';
      while (i < remaining.length) {
        const ch = remaining[i];
        if (inStr) {
          if (ch === strChar) inStr = false;
        } else {
          if (ch === "'" || ch === '"') { inStr = true; strChar = ch; }
          else if (/BEGIN/i.test(remaining.slice(i, i + 5))) { depth++; i += 4; }
          else if (/\bEND\b/i.test(remaining.slice(i, i + 3))) {
            depth--;
            if (depth === 0) {
              // Find the ; after END
              const semiIdx = remaining.indexOf(';', i);
              const end = semiIdx === -1 ? remaining.length : semiIdx + 1;
              statements.push(remaining.slice(0, end).trim());
              remaining = remaining.slice(end);
              i = -1; // reset outer loop
              break;
            }
          }
        }
        i++;
      }
      if (i !== -1) {
        // Malformed trigger
        statements.push(remaining.trim());
        break;
      }
    } else {
      // Regular statement: split on next ;
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
        await db.execute(stmt, false);
      }
      await db.run(
        'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)',
        [migration.version, migration.name, Date.now()],
        false
      );
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
          await db.run(
            'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)',
            [migration.version, migration.name, Date.now()], false
          );
        } catch (ie) { logger.error(`Failed to mark ${migration.name} done.`, ie); }
      } else {
        logger.error(`Migration ${migration.name} failed.`, err);
        throw err;
      }
    }
  }
}
