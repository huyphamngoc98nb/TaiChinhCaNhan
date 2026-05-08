import { getDbConnection } from '@/core/db/sqlite/connection';

export interface Wallet {
  id: string;
  name: string;
  currency: string;
  balance: number;
  updated_at: number;
}

export class SQLiteWalletRepository {
  async getById(id: string): Promise<Wallet | null> {
    const db = await getDbConnection();
    const { values } = await db.query(
      'SELECT id, name, currency, balance, updated_at FROM wallets WHERE id = ?',
      [id]
    );
    if (!values || values.length === 0) return null;
    return values[0];
  }

  async updateBalance(id: string, newBalance: number, updatedAt: number): Promise<void> {
    const db = await getDbConnection();
    await db.run(
      'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?',
      [newBalance, updatedAt, id]
    );
  }

  /**
   * Atomic balance delta — safe against race conditions.
   * Uses a single SQL statement so concurrent calls cannot interleave.
   */
  async updateBalanceDelta(id: string, delta: number, updatedAt: number): Promise<void> {
    const db = await getDbConnection();
    await db.run(
      'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [delta, updatedAt, id]
    );
  }
}
