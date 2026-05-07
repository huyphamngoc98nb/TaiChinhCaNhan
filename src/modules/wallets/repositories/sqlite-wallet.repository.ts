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
    const { values } = await db.query('SELECT * FROM wallets WHERE id = ?', [id]);
    if (!values || values.length === 0) return null;
    return values[0];
  }

  async updateBalance(id: string, newBalance: number, updatedAt: number): Promise<void> {
    const db = await getDbConnection();
    await db.run('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?', [newBalance, updatedAt, id]);
  }
}
