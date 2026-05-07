import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

export const sqlite = new SQLiteConnection(CapacitorSQLite);

export const PRAGMAS = [
  'PRAGMA foreign_keys = ON;',
];

export async function applyPragmas(dbName: string) {
  const db = await sqlite.retrieveConnection(dbName, false);
  for (const pragma of PRAGMAS) {
    try {
      await db.execute(pragma);
    } catch (e) {
      console.warn(`Failed to apply pragma: ${pragma}`, e);
    }
  }
}
