import { getDbConnectionForTransaction, isManagedTransactionActive } from '@/core/db/sqlite/transaction';
import { ITransactionRepository } from './transaction.repository';
import { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilter } from '../domain/transaction.model';
import { mapToTransaction } from '../domain/transaction.mapper';

export class SQLiteTransactionRepository implements ITransactionRepository {
  async create(data: CreateTransactionInput & { id: string, created_at: number, updated_at: number }): Promise<Transaction> {
    const db = await getDbConnectionForTransaction();
    const sql = `
      INSERT INTO transactions (id, wallet_id, category_id, type, amount, note, receipt_path, to_wallet_id, transaction_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.id, data.wallet_id, data.category_id, data.type, data.amount,
      data.note || null, data.receipt_path || null, data.to_wallet_id || null,
      data.transaction_date, data.created_at, data.updated_at
    ];
    await db.run(sql, values, !isManagedTransactionActive());
    return {
      id: data.id,
      wallet_id: data.wallet_id,
      category_id: data.category_id,
      type: data.type,
      amount: data.amount,
      note: data.note || null,
      receipt_path: data.receipt_path || null,
      to_wallet_id: data.to_wallet_id || null,
      transaction_date: data.transaction_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
      deleted_at: null,
    };
  }

  // MINOR-1 fix: thay any[] bằng unknown[] — an toàn hơn về type
  async update(id: string, data: UpdateTransactionInput & { updated_at: number }): Promise<Transaction | null> {
    const db = await getDbConnectionForTransaction();

    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.wallet_id !== undefined) { sets.push('wallet_id = ?'); values.push(data.wallet_id); }
    if (data.category_id !== undefined) { sets.push('category_id = ?'); values.push(data.category_id); }
    if (data.type !== undefined) { sets.push('type = ?'); values.push(data.type); }
    if (data.amount !== undefined) { sets.push('amount = ?'); values.push(data.amount); }
    if (data.note !== undefined) { sets.push('note = ?'); values.push(data.note); }
    if (data.receipt_path !== undefined) { sets.push('receipt_path = ?'); values.push(data.receipt_path); }
    if (data.to_wallet_id !== undefined) { sets.push('to_wallet_id = ?'); values.push(data.to_wallet_id); }
    if (data.transaction_date !== undefined) { sets.push('transaction_date = ?'); values.push(data.transaction_date); }

    sets.push('updated_at = ?'); values.push(data.updated_at);
    values.push(id);

    const sql = `UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`;
    await db.run(sql, values as unknown[], !isManagedTransactionActive());

    return this.getById(id);
  }

  async softDelete(id: string, deleted_at: number): Promise<boolean> {
    const db = await getDbConnectionForTransaction();
    const sql = `UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?`;
    const res = await db.run(sql, [deleted_at, deleted_at, id], !isManagedTransactionActive());
    return (res.changes?.changes ?? 0) > 0;
  }

  /**
   * Bug #5 fix: filter deleted_at IS NULL so soft-deleted records
   * are never returned to business logic as if they were active.
   */
  async getById(id: string): Promise<Transaction | null> {
    const db = await getDbConnectionForTransaction();
    const sql = `
      SELECT id, wallet_id, category_id, type, amount, note, receipt_path, to_wallet_id,
             transaction_date, created_at, updated_at, deleted_at
      FROM transactions
      WHERE id = ? AND deleted_at IS NULL
    `;
    const { values } = await db.query(sql, [id]);
    if (!values || values.length === 0) return null;
    return mapToTransaction(values[0]);
  }

  /**
   * Fetch a record regardless of deleted_at — used internally
   * (e.g. idempotency check in DeleteTransactionUseCase).
   */
  async getByIdIncludeDeleted(id: string): Promise<Transaction | null> {
    const db = await getDbConnectionForTransaction();
    const sql = `
      SELECT id, wallet_id, category_id, type, amount, note, receipt_path, to_wallet_id,
             transaction_date, created_at, updated_at, deleted_at
      FROM transactions
      WHERE id = ?
    `;
    const { values } = await db.query(sql, [id]);
    if (!values || values.length === 0) return null;
    return mapToTransaction(values[0]);
  }

  async getAllReceiptPaths(): Promise<string[]> {
    const db = await getDbConnectionForTransaction();
    const { values } = await db.query(
      `SELECT receipt_path
       FROM transactions
       WHERE deleted_at IS NULL AND receipt_path IS NOT NULL`
    );
    return (values ?? []).map((row: Record<string, unknown>) => row.receipt_path as string);
  }

  async list(filter: TransactionFilter): Promise<Transaction[]> {
    const db = await getDbConnectionForTransaction();
    let sql = `
      SELECT
        t.id, t.wallet_id, t.category_id, t.type, t.amount, t.note,
        t.receipt_path, t.to_wallet_id, t.transaction_date, t.created_at, t.updated_at, t.deleted_at,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        w.name AS wallet_name,
        tw.name AS to_wallet_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
      WHERE 1=1
    `;
    const values: unknown[] = [];

    if (!filter.includeDeleted) {
      sql += ` AND t.deleted_at IS NULL`;
    }
    if (filter.wallet_id) {
      sql += ` AND t.wallet_id = ?`;
      values.push(filter.wallet_id);
    }
    if (filter.category_id) {
      sql += ` AND t.category_id = ?`;
      values.push(filter.category_id);
    }
    if (filter.type) {
      sql += ` AND t.type = ?`;
      values.push(filter.type);
    }
    if (filter.startDate) {
      sql += ` AND t.transaction_date >= ?`;
      values.push(filter.startDate);
    }
    if (filter.endDate) {
      sql += ` AND t.transaction_date <= ?`;
      values.push(filter.endDate);
    }
    if (filter.note && filter.note.trim() !== '') {
      sql += ` AND t.note LIKE ?`;
      values.push(`%${filter.note.trim()}%`);
    }

    sql += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;

    if (filter.limit) {
      sql += ` LIMIT ?`;
      values.push(filter.limit);
      if (filter.offset) {
        sql += ` OFFSET ?`;
        values.push(filter.offset);
      }
    }

    const { values: rows } = await db.query(sql, values as unknown[]);
    return (rows || []).map(mapToTransaction);
  }

  /**
   * Aggregate income and expense totals grouped by wallet account_type.
   * Useful for account-type breakdown in reports.
   * Excludes soft-deleted transactions (deleted_at IS NULL).
   */
  async getSummaryByAccountType(): Promise<
    { account_type: string; total_expense: number; total_income: number }[]
  > {
    const db = await getDbConnectionForTransaction();
    const sql = `
      SELECT
        w.account_type,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense,
        COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END), 0) AS total_income
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.id
      WHERE t.deleted_at IS NULL
      GROUP BY w.account_type
      ORDER BY w.account_type
    `;
    const { values } = await db.query(sql);
    return (values ?? []).map((row: Record<string, unknown>) => ({
      account_type:  row.account_type as string,
      total_expense: row.total_expense as number,
      total_income:  row.total_income  as number,
    }));
  }
}

