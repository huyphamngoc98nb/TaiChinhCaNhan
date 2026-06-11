import { DB_NAME, getDbConnection } from './connection';
import { Capacitor } from '@capacitor/core';
import { sqlite } from './pragmas';

let transactionQueue: Promise<void> = Promise.resolve();
let managedTransactionDepth = 0;
let transactionCallbackDepth = 0;
let currentManagedDb: any = null;

export function isManagedTransactionActive(): boolean {
  return managedTransactionDepth > 0;
}

export async function getDbConnectionForTransaction(): Promise<any> {
  return currentManagedDb ?? getDbConnection();
}

function isReentrantTransactionCall(): boolean {
  return transactionCallbackDepth > 0;
}

function getReentrantDb(): any | null {
  return isReentrantTransactionCall() ? currentManagedDb : null;
}

async function runExclusive<T>(work: () => Promise<T>): Promise<T> {
  const previous = transactionQueue;
  let release = () => {};

  const lock = new Promise<void>((resolve) => {
    release = resolve;
  });

  transactionQueue = previous.catch(() => undefined).then(() => lock);
  await previous.catch(() => undefined);

  try {
    return await work();
  } finally {
    release();
  }
}

async function runManagedWork<T>(db: any, work: () => Promise<T>): Promise<T> {
  managedTransactionDepth += 1;
  transactionCallbackDepth += 1;
  const previousManagedDb = currentManagedDb;
  currentManagedDb = db;

  try {
    return await work();
  } finally {
    currentManagedDb = previousManagedDb;
    transactionCallbackDepth -= 1;
    managedTransactionDepth -= 1;
  }
}

/**
 * Wraps `work` in a SQLite transaction.
 *
 * - Native (iOS/Android): uses BEGIN / COMMIT / ROLLBACK.
 * - Web: CapacitorSQLite does not support explicit transactions on the web
 *   store; root transaction work is serialized through the same queue and
 *   callers still invoke `sqlite.saveToStore()` afterwards if persistence is
 *   needed.
 *
 * Nested-transaction safe: direct nested calls made from inside the active
 * transaction callback participate in the outer transaction (no SAVEPOINT).
 */
export async function runInTransaction<T>(
  work: (db: any) => Promise<T>
): Promise<T> {
  // Direct nested calls share the outer managed scope and must not wait on the queue.
  const reentrantDb = getReentrantDb();
  if (reentrantDb) {
    return work(reentrantDb);
  }

  const db = await getDbConnection();
  const isWeb = Capacitor.getPlatform() === 'web';

  if (isWeb) {
    return runExclusive(() =>
      runManagedWork(db, async () => {
        try {
          const result = await work(db);
          try {
            await sqlite.saveToStore(DB_NAME);
          } catch (saveErr) {
            console.warn('[transaction] saveToStore failed after successful work:', saveErr);
          }
          return result;
        } catch (err) {
          console.error(
            '[transaction] Work failed on Web platform - partial state may exist. Manual compensation required.',
            err
          );
          throw err;
        }
      })
    );
  }

  return runExclusive(async () => {
    const { result: isActive } = await db.isTransactionActive();
    const shouldManage = !isActive;

    if (shouldManage) {
      await db.beginTransaction();
    }

    try {
      const result = await runManagedWork(db, () => work(db));
      if (shouldManage) {
        await db.commitTransaction();
      }
      return result;
    } catch (error) {
      if (shouldManage) {
        await db.rollbackTransaction();
      }
      throw error;
    }
  });
}
