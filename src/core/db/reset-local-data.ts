import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';
import { DB_NAME } from './sqlite/connection';
import { sqlite } from './sqlite/pragmas';

export async function deleteLocalDatabase(): Promise<void> {
  const connectionExists = (await sqlite.isConnection(DB_NAME, false)).result === true;
  if (connectionExists) {
    await sqlite.closeConnection(DB_NAME, false);
  }

  await CapacitorSQLite.deleteDatabase({
    database: DB_NAME,
    readonly: false,
  });
}

export async function clearNativeEncryptionSecret(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') return;
  await sqlite.clearEncryptionSecret();
}
