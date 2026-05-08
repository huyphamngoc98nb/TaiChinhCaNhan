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



const MIGRATIONS = [
  { version: 1, name: '001_init', sql: initSql },
  { version: 2, name: '002_indexes', sql: indexesSql },
  { version: 3, name: '003_transactions_soft_delete', sql: softDeleteSql },
  { version: 4, name: '004_transactions_receipt_path', sql: receiptPathSql },
  { version: 5, name: '005_category_budgets', sql: categoryBudgetsSql },
  { version: 6, name: '006_recurring_bills_reminder', sql: recurringBillsReminderSql },
  { version: 7, name: '007_transactions_transfer_wallet', sql: transferWalletSql },
  { version: 8, name: '008_wallet_balance_triggers', sql: balanceTriggersSql },
  { version: 9, name: '009_recurring_bills_delete_fix', sql: rbDeleteFixSql },
];

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

  // BUG-03: Get ALL applied versions to detect gaps
  const { values } = await db.query('SELECT version FROM migrations');
  const appliedVersions = new Set(values?.map((v: any) => v.version) || []);

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      logger.info(`Running migration: ${migration.name}`);
      const isWeb = Capacitor.getPlatform() === 'web';
      let transactionStarted = false;

      // On web, transactions are not supported in the same way by jeep-sqlite,
      // so we skip them but handle idempotency via try/catch.
      if (!isWeb) {
        const { result: isActive } = await db.isTransactionActive();
        if (!isActive) {
          await db.beginTransaction();
          transactionStarted = true;
        }
      }

      try {
        await db.execute(migration.sql, false);
        const executedAt = Date.now();
        await db.run(
          'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)',
          [migration.version, migration.name, executedAt],
          false
        );
        if (transactionStarted) await db.commitTransaction();
        logger.info(`Migration ${migration.name} completed.`);
      } catch (err: any) {
        if (transactionStarted) {
          try {
            await db.rollbackTransaction();
          } catch (rollbackErr) {
            logger.warn(`Rollback for ${migration.name} failed:`, rollbackErr);
          }
        }

        // BUG-04: Handle partially applied migrations on web
        const errorMessage = err.message || '';
        const isDuplicateError = 
          errorMessage.includes('already exists') || 
          errorMessage.includes('duplicate column');

        if (isWeb && isDuplicateError) {
          logger.warn(`Migration ${migration.name} encountered a duplicate schema error on web. It might have been partially applied. Marking as executed.`);
          try {
            await db.run(
              'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)',
              [migration.version, migration.name, Date.now()],
              false
            );
          } catch (insertErr) {
             // If this fails, the record might already be there or something else is wrong.
             logger.error(`Failed to mark partially applied migration ${migration.name} as done.`, insertErr);
          }
        } else {
          logger.error(`Migration ${migration.name} failed.`, err);
          throw err;
        }
      }
    }
  }
}
