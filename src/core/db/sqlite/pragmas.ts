import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

export const sqlite = new SQLiteConnection(CapacitorSQLite);

export const PRAGMAS: Array<{ sql: string; critical: boolean }> = [
  { sql: 'PRAGMA foreign_keys = ON;', critical: true },
];

export async function applyPragmas(dbName: string) {
  const db = await sqlite.retrieveConnection(dbName, false);
  for (const pragma of PRAGMAS) {
    try {
      await db.execute(pragma.sql);
    } catch (e) {
      if (pragma.critical) {
        throw new Error(`Critical pragma failed [${pragma.sql}]: ${e}`);
      }
      console.warn(`Non-critical pragma failed: ${pragma.sql}`, e);
    }
  }
}
