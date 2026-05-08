import { Capacitor } from '@capacitor/core';
import { getDbConnection } from '../sqlite/connection';
import { logger } from '@/core/telemetry/logger';

import initSql from './001_init.sql?raw';
import indexesSql from './002_indexes.sql?raw';
import softDeleteSql from './003_transactions_soft_delete.sql?raw';
import receiptPathSql from './004_transactions_receipt_path.sql?raw';
import categoryBudgetsSql from './005_category_budgets.sql?raw';
import recurringBillsReminderSql from './006_recurring_bills_reminder.sql?raw';

const MIGRATIONS = [
  { version: 1, name: '001_init', sql: initSql },
  { version: 2, name: '002_indexes', sql: indexesSql },
  { version: 3, name: '003_transactions_soft_delete', sql: softDeleteSql },
  { version: 4, name: '004_transactions_receipt_path', sql: receiptPathSql },
  { version: 5, name: '005_category_budgets', sql: categoryBudgetsSql },
  { version: 6, name: '006_recurring_bills_reminder', sql: recurringBillsReminderSql },
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

  const { values } = await db.query('SELECT version FROM migrations ORDER BY version DESC LIMIT 1');
  const currentVersion = values && values.length > 0 ? values[0].version : 0;

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      logger.info(`Running migration: ${migration.name}`);
      const isWeb = Capacitor.getPlatform() === 'web';
      let transactionStarted = false;
      if (!isWeb) {
        const { result: isActive } = await db.isTransactionActive();
        if (!isActive) {
          await db.beginTransaction();
          transactionStarted = true;
        }
      }
      try {
        // Pass false to execute() to prevent it from starting its own transaction,
        // as we are managing it manually with begin/commitTransaction.
        await db.execute(migration.sql, false);
        const executedAt = Date.now();
        await db.run(
          'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)',
          [migration.version, migration.name, executedAt],
          false // don't start a transaction
        );
        if (transactionStarted) await db.commitTransaction();
        logger.info(`Migration ${migration.name} completed.`);
      } catch (err) {
        if (transactionStarted) {
          try {
            await db.rollbackTransaction();
          } catch (rollbackErr) {
            logger.warn(`Rollback for ${migration.name} failed:`, rollbackErr);
          }
        }
        logger.error(`Migration ${migration.name} failed.`, err);
        throw err;
      }
    }
  }
}
