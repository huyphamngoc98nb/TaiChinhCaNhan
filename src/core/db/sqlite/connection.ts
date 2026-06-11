import { Capacitor } from '@capacitor/core';
import { sqlite, applyPragmas } from './pragmas';
import { getSQLiteEncryptionConfig } from './encryption';
import { logger } from '@/core/telemetry/logger';

export const DB_NAME = 'taixiu_db';

let webStoreInitPromise: Promise<void> | null = null;
let initPromise: Promise<any> | null = null;

async function ensureWebStoreInitialized() {
  if (webStoreInitPromise) {
    await webStoreInitPromise;
    return;
  }

  webStoreInitPromise = (async () => {
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    defineCustomElements(window);

    if (!document.querySelector('jeep-sqlite')) {
      const jeepEl = document.createElement('jeep-sqlite');
      document.body.appendChild(jeepEl);
    }

    await customElements.whenDefined('jeep-sqlite');
    await sqlite.initWebStore();
    logger.info('Jeep SQLite initialized for Web.');
  })();

  await webStoreInitPromise;
}

export async function initDatabaseConnection() {
  if (initPromise) return initPromise;

  initPromise = _initDatabaseConnectionImpl().finally(() => {
    initPromise = null;
  });
  return initPromise;
}

async function _initDatabaseConnectionImpl() {
  try {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      await ensureWebStoreInitialized();
    }

    const encryption = getSQLiteEncryptionConfig();

    await sqlite.checkConnectionsConsistency();

    let db;
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

    if (isConn) {
      try {
        db = await sqlite.retrieveConnection(DB_NAME, false);
        await db.open();
        await applyPragmas(DB_NAME);
        logger.info('Database connection reopened and pragmas applied.');
        return db;
      } catch (error) {
        logger.warn('Existing SQLite connection is stale; recreating it.', error);
        try {
          await sqlite.closeConnection(DB_NAME, false);
        } catch {
          // Native process resume can leave the JS connection cache ahead of the plugin state.
        }
      }
    }

    try {
      db = await sqlite.createConnection(
        DB_NAME,
        encryption.encrypted,
        encryption.mode,
        1,
        false
      );
    } catch (error) {
      logger.warn('SQLite createConnection failed; retrying after closing stale connection.', error);
      try {
        await sqlite.closeConnection(DB_NAME, false);
      } catch {
        // Ignore cleanup failures before the retry.
      }
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
