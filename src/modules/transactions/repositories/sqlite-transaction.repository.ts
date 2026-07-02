import { getDbConnectionForTransaction, isManagedTransactionActive } from '@/core/db/sqlite/transaction';
import { ITransactionRepository } from './transaction.repository';
import { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionFilter } from '../domain/transaction.model';
import { mapToTransaction } from '../domain/transaction.mapper';

export class SQLiteTransactionRepository implements ITransactionRepository {
  async create(data: CreateTransactionInput & { id: string, created_at: number, updated_at: number }): Promise<Transaction> {
    const db = await getDbConnectionForTransaction();
    const sql = `
      INSERT INTO transactions (
        id, wallet_id, category_id, type, amount, note, to_wallet_id,
        transaction_date, exclude_from_total, is_budget_offset, offset_budget_id,
        source_type, source_id, source_event, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      data.id, data.wallet_id, data.category_id, data.type, data.amount,
      data.note || null, data.to_wallet_id || null,
      data.transaction_date, data.exclude_from_total ? 1 : 0,
      data.is_budget_offset ? 1 : 0, data.offset_budget_id || null,
      data.source_type ?? null, data.source_id ?? null, data.source_event ?? null,
      data.created_at, data.updated_at
    ];
    await db.run(sql, values, !isManagedTransactionActive());
    return {
      id: data.id,
      wallet_id: data.wallet_id,
      category_id: data.category_id,
      type: data.type,
      amount: data.amount,
      note: data.note || null,
      to_wallet_id: data.to_wallet_id || null,
      exclude_from_total: data.exclude_from_total ?? false,
      is_budget_offset: data.is_budget_offset ?? false,
      offset_budget_id: data.offset_budget_id ?? null,
      source_type: data.source_type ?? null,
      source_id: data.source_id ?? null,
      source_event: data.source_event ?? null,
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
    if (data.to_wallet_id !== undefined) { sets.push('to_wallet_id = ?'); values.push(data.to_wallet_id); }
    if (data.transaction_date !== undefined) { sets.push('transaction_date = ?'); values.push(data.transaction_date); }
    if (data.exclude_from_total !== undefined) {
      sets.push('exclude_from_total = ?');
      values.push(data.exclude_from_total ? 1 : 0);
    }
    if (data.is_budget_offset !== undefined) {
      sets.push('is_budget_offset = ?');
      values.push(data.is_budget_offset ? 1 : 0);
    }
    if (data.offset_budget_id !== undefined) { sets.push('offset_budget_id = ?'); values.push(data.offset_budget_id); }
    if (data.source_type !== undefined) { sets.push('source_type = ?'); values.push(data.source_type); }
    if (data.source_id !== undefined) { sets.push('source_id = ?'); values.push(data.source_id); }
    if (data.source_event !== undefined) { sets.push('source_event = ?'); values.push(data.source_event); }

    sets.push('updated_at = ?'); values.push(data.updated_at);
    values.push(id);

    const sql = `UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`;
    await db.run(sql, values as unknown[], !isManagedTransactionActive());

    return this.getById(id);
  }

  async softDelete(id: string, deleted_at: number): Promise<boolean> {
    const db = await getDbConnectionForTransaction();
    const sql = `UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`;
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
      SELECT t.id, t.wallet_id, t.category_id, t.type, t.amount, t.note, t.to_wallet_id,
             t.transaction_date, t.exclude_from_total, t.is_budget_offset, t.offset_budget_id,
             t.source_type, t.source_id, t.source_event,
             t.created_at, t.updated_at, t.deleted_at,
             bc.name AS offset_budget_name
      FROM transactions t
      LEFT JOIN budgets ob ON ob.id = t.offset_budget_id
      LEFT JOIN categories bc ON bc.id = ob.category_id
      WHERE t.id = ? AND t.deleted_at IS NULL
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
      SELECT t.id, t.wallet_id, t.category_id, t.type, t.amount, t.note, t.to_wallet_id,
             t.transaction_date, t.exclude_from_total, t.is_budget_offset, t.offset_budget_id,
             t.source_type, t.source_id, t.source_event,
             t.created_at, t.updated_at, t.deleted_at,
             bc.name AS offset_budget_name
      FROM transactions t
      LEFT JOIN budgets ob ON ob.id = t.offset_budget_id
      LEFT JOIN categories bc ON bc.id = ob.category_id
      WHERE t.id = ?
    `;
    const { values } = await db.query(sql, [id]);
    if (!values || values.length === 0) return null;
    return mapToTransaction(values[0]);
  }

  async getBySource(
    sourceType: string,
    sourceId: string,
    sourceEvent: string
  ): Promise<Transaction | null> {
    const db = await getDbConnectionForTransaction();
    const { values } = await db.query(
      `SELECT t.id, t.wallet_id, t.category_id, t.type, t.amount, t.note, t.to_wallet_id,
              t.transaction_date, t.exclude_from_total, t.is_budget_offset, t.offset_budget_id,
              t.source_type, t.source_id, t.source_event,
              t.created_at, t.updated_at, t.deleted_at,
              bc.name AS offset_budget_name
       FROM transactions t
       LEFT JOIN budgets ob ON ob.id = t.offset_budget_id
       LEFT JOIN categories bc ON bc.id = ob.category_id
       WHERE t.source_type = ?
         AND t.source_id = ?
         AND t.source_event = ?
         AND t.deleted_at IS NULL
       LIMIT 1`,
      [sourceType, sourceId, sourceEvent]
    );
    if (!values || values.length === 0) return null;
    return mapToTransaction(values[0]);
  }

  async list(filter: TransactionFilter): Promise<Transaction[]> {
    const db = await getDbConnectionForTransaction();
    let sql = `
      SELECT
        t.id, t.wallet_id, t.category_id, t.type, t.amount, t.note,
        t.to_wallet_id, t.transaction_date, t.exclude_from_total,
        t.is_budget_offset, t.offset_budget_id,
        t.source_type, t.source_id, t.source_event,
        t.created_at, t.updated_at, t.deleted_at,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color,
        w.name AS wallet_name,
        w.currency AS wallet_currency,
        tw.name AS to_wallet_name,
        bc.name AS offset_budget_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
      LEFT JOIN budgets ob ON ob.id = t.offset_budget_id
      LEFT JOIN categories bc ON bc.id = ob.category_id
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
        COALESCE(SUM(CASE WHEN t.type = 'income' AND t.is_budget_offset = 0 THEN t.amount ELSE 0 END), 0) AS total_income
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.id
      WHERE t.deleted_at IS NULL
        AND t.exclude_from_total = 0
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

