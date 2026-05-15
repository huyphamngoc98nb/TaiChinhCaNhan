import { Capacitor } from '@capacitor/core';
import { sqlite, applyPragmas } from './pragmas';
import { getSQLiteEncryptionConfig } from './encryption';
import { logger } from '@/core/telemetry/logger';

export const DB_NAME = 'taixiu_db';

export async function initDatabaseConnection() {
  try {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      // Setup jeep-sqlite for web if needed
      const { defineCustomElements } = await import('jeep-sqlite/loader');
      defineCustomElements(window);
      const jeepEl = document.createElement('jeep-sqlite');
      document.body.appendChild(jeepEl);
      await customElements.whenDefined('jeep-sqlite');
      await sqlite.initWebStore();
      logger.info('Jeep SQLite initialized for Web.');
    }

    const encryption = getSQLiteEncryptionConfig();

    // Check connections
    const connections = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

    let db;
    if (connections.result && isConn) {
      db = await sqlite.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqlite.createConnection(
        DB_NAME,
        encryption.encrypted,
        encryption.mode,
        1,
        false
      );
    }

    await db.open();
    await applyPragmas(DB_NAME);
    
    logger.info('Database connection established and pragmas applied.');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database connection', error);
    throw error;
  }
}

export async function getDbConnection() {
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
  if (!isConn) {
    throw new Error(`Database connection for ${DB_NAME} is not ready. Call initDatabaseConnection first.`);
  }
  return await sqlite.retrieveConnection(DB_NAME, false);
}

export async function isDatabaseReady(): Promise<boolean> {
  try {
    const isConn = await sqlite.isConnection(DB_NAME, false);
    if (!isConn.result) return false;
    const db = await sqlite.retrieveConnection(DB_NAME, false);
    return (await db.isDBOpen()).result || false;
  } catch (e) {
    return false;
  }
}
