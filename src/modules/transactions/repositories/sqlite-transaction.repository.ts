import { getDbConnection } from '@/core/db/sqlite/connection';
import { ITransactionRepository } from './transaction.repository';
import { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilter } from '../domain/transaction.model';
import { mapToTransaction } from '../domain/transaction.mapper';

export class SQLiteTransactionRepository implements ITransactionRepository {
  async create(data: CreateTransactionInput & { id: string, created_at: number, updated_at: number }): Promise<Transaction> {
    const db = await getDbConnection();
    const sql = `
      INSERT INTO transactions (id, wallet_id, category_id, type, amount, note, receipt_path, transaction_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.id, data.wallet_id, data.category_id, data.type, data.amount,
      data.note || null, data.receipt_path || null, data.transaction_date, data.created_at, data.updated_at
    ];
    await db.run(sql, values);
    return this.getById(data.id) as Promise<Transaction>;
  }

  async update(id: string, data: UpdateTransactionInput & { updated_at: number }): Promise<Transaction | null> {
    const db = await getDbConnection();
    
    const sets: string[] = [];
    const values: any[] = [];

    if (data.category_id !== undefined) { sets.push('category_id = ?'); values.push(data.category_id); }
    if (data.type !== undefined) { sets.push('type = ?'); values.push(data.type); }
    if (data.amount !== undefined) { sets.push('amount = ?'); values.push(data.amount); }
    if (data.note !== undefined) { sets.push('note = ?'); values.push(data.note); }
    if (data.receipt_path !== undefined) { sets.push('receipt_path = ?'); values.push(data.receipt_path); }
    if (data.transaction_date !== undefined) { sets.push('transaction_date = ?'); values.push(data.transaction_date); }
    
    sets.push('updated_at = ?'); values.push(data.updated_at);
    
    values.push(id);

    const sql = `UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`;
    await db.run(sql, values);

    return this.getById(id);
  }

  async softDelete(id: string, deleted_at: number): Promise<boolean> {
    const db = await getDbConnection();
    const sql = `UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?`;
    const res = await db.run(sql, [deleted_at, deleted_at, id]);
    return (res.changes?.changes ?? 0) > 0;
  }

  async getById(id: string): Promise<Transaction | null> {
    const db = await getDbConnection();
    const sql = `
      SELECT id, wallet_id, category_id, type, amount, note, receipt_path, transaction_date, created_at, updated_at, deleted_at 
      FROM transactions 
      WHERE id = ?
    `;
    const { values } = await db.query(sql, [id]);
    if (!values || values.length === 0) return null;
    return mapToTransaction(values[0]);
  }

  async list(filter: TransactionFilter): Promise<Transaction[]> {
    const db = await getDbConnection();
    let sql = `
      SELECT id, wallet_id, category_id, type, amount, note, receipt_path, transaction_date, created_at, updated_at, deleted_at 
      FROM transactions 
      WHERE 1=1
    `;
    const values: any[] = [];

    if (!filter.includeDeleted) {
      sql += ` AND deleted_at IS NULL`;
    }
    if (filter.wallet_id) {
      sql += ` AND wallet_id = ?`;
      values.push(filter.wallet_id);
    }
    if (filter.category_id) {
      sql += ` AND category_id = ?`;
      values.push(filter.category_id);
    }
    if (filter.type) {
      sql += ` AND type = ?`;
      values.push(filter.type);
    }
    if (filter.startDate) {
      sql += ` AND transaction_date >= ?`;
      values.push(filter.startDate);
    }
    if (filter.endDate) {
      sql += ` AND transaction_date <= ?`;
      values.push(filter.endDate);
    }

    sql += ` ORDER BY transaction_date DESC, created_at DESC`;

    if (filter.limit) {
      sql += ` LIMIT ?`;
      values.push(filter.limit);
      if (filter.offset) {
        sql += ` OFFSET ?`;
        values.push(filter.offset);
      }
    }

    const { values: rows } = await db.query(sql, values);
    return (rows || []).map(mapToTransaction);
  }
}
