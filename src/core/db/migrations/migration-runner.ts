import { getDbConnection } from '../sqlite/connection';
import { logger } from '@/core/telemetry/logger';

import initSql from './001_init.sql?raw';
import indexesSql from './002_indexes.sql?raw';
import softDeleteSql from './003_transactions_soft_delete.sql?raw';
import receiptPathSql from './004_transactions_receipt_path.sql?raw';

const MIGRATIONS = [
  { version: 1, name: '001_init', sql: initSql },
  { version: 2, name: '002_indexes', sql: indexesSql },
  { version: 3, name: '003_transactions_soft_delete', sql: softDeleteSql },
  { version: 4, name: '004_transactions_receipt_path', sql: receiptPathSql },
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
      if (!isWeb) await db.beginTransaction();
      try {
        await db.execute(migration.sql);
        const executedAt = Date.now();
        await db.run(
          'INSERT INTO migrations (version, name, executed_at) VALUES (?, ?, ?)',
          [migration.version, migration.name, executedAt]
        );
        if (!isWeb) await db.commitTransaction();
        logger.info(`Migration ${migration.name} completed.`);
      } catch (err) {
        if (!isWeb) {
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
