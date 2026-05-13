import { Directory, Filesystem } from '@capacitor/filesystem';
import { getDbConnection } from '@/core/db/sqlite/connection';
import type { RollbackResult } from '@/types/update';

const ACTIVE_BUNDLE_PATH_KEY = 'activeBundlePath';
const ACTIVE_BUNDLE_VERSION_KEY = 'activeBundleVersion';
const LAST_GOOD_BUNDLE_PATH_KEY = 'lastGoodBundlePath';
const ROLLBACK_COUNT_KEY = 'rollbackCount';

interface ConfigRow {
  value?: unknown;
}

async function ensureAppConfigTable(): Promise<void> {
  const db = await getDbConnection();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

async function getConfig(key: string): Promise<string | null> {
  await ensureAppConfigTable();

  const db = await getDbConnection();
  const result = await db.query('SELECT value FROM app_config WHERE key = ?', [key]);
  const row = result.values?.[0] as ConfigRow | undefined;

  return typeof row?.value === 'string' ? row.value : null;
}

async function setConfig(key: string, value: string): Promise<void> {
  await ensureAppConfigTable();

  const db = await getDbConnection();
  await db.run('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)', [key, value]);
}

async function deleteDirectory(dirPath: string): Promise<void> {
  try {
    await Filesystem.rmdir({
      path: dirPath,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    console.warn('[RollbackService] delete_directory_failed');
    throw new Error('delete_directory_failed');
  }
}

function parseRollbackCount(value: string | null): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function logResult(result: RollbackResult): void {
  if (result.status === 'rolled_back') {
    console.info(`[RollbackService] status=rolled_back count=${result.rollbackCount ?? 0}`);
    return;
  }

  console.error(`[RollbackService] status=${result.status}`);
}

export async function promoteBundle(newBundleVersion: string, newBundlePath: string): Promise<void> {
  const activeBundlePath = await getConfig(ACTIVE_BUNDLE_PATH_KEY);
  const lastGoodBundlePath = await getConfig(LAST_GOOD_BUNDLE_PATH_KEY);

  if (lastGoodBundlePath && lastGoodBundlePath !== activeBundlePath) {
    await deleteDirectory(lastGoodBundlePath);
  }

  if (activeBundlePath) {
    await setConfig(LAST_GOOD_BUNDLE_PATH_KEY, activeBundlePath);
  }

  await setConfig(ACTIVE_BUNDLE_PATH_KEY, newBundlePath);
  await setConfig(ACTIVE_BUNDLE_VERSION_KEY, newBundleVersion);
}

export async function markCurrentAsGood(): Promise<void> {
  const activeBundlePath = await getConfig(ACTIVE_BUNDLE_PATH_KEY);
  if (!activeBundlePath) {
    return;
  }

  await setConfig(LAST_GOOD_BUNDLE_PATH_KEY, activeBundlePath);
}

export async function rollback(): Promise<RollbackResult> {
  try {
    const activeBundlePath = await getConfig(ACTIVE_BUNDLE_PATH_KEY);
    const lastGoodBundlePath = await getConfig(LAST_GOOD_BUNDLE_PATH_KEY);

    if (!lastGoodBundlePath) {
      const result: RollbackResult = { success: false, status: 'no_fallback' };
      logResult(result);
      return result;
    }

    await setConfig(ACTIVE_BUNDLE_PATH_KEY, lastGoodBundlePath);

    if (activeBundlePath && activeBundlePath !== lastGoodBundlePath) {
      await deleteDirectory(activeBundlePath);
    }

    const rollbackCount = parseRollbackCount(await getConfig(ROLLBACK_COUNT_KEY)) + 1;
    await setConfig(ROLLBACK_COUNT_KEY, String(rollbackCount));
    await setConfig(LAST_GOOD_BUNDLE_PATH_KEY, '');

    const result: RollbackResult = { success: true, status: 'rolled_back', rollbackCount };
    logResult(result);
    return result;
  } catch {
    const result: RollbackResult = { success: false, status: 'rollback_error' };
    logResult(result);
    return result;
  }
}
