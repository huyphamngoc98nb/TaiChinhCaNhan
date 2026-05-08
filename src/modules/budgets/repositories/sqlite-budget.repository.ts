import { IBudgetRepository } from './budget.repository';
import { Budget, BudgetWithCategory, BudgetPeriod, CreateBudgetDto } from '../domain/budget.model';
import { getDbConnection } from '@/core/db/sqlite/connection';

/** Tạo UUID đơn giản dùng crypto nếu có, fallback random */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export class SQLiteBudgetRepository implements IBudgetRepository {
  async getActiveBudgets(
    period: BudgetPeriod,
    walletId?: string
  ): Promise<BudgetWithCategory[]> {
    const db = await getDbConnection();

    // wallet_id IS NULL nghĩa là budget áp dụng mọi ví
    const walletFilter = walletId
      ? 'AND (b.wallet_id = ? OR b.wallet_id IS NULL)'
      : '';
    const params: unknown[] = [period];
    if (walletId) params.push(walletId);

    const sql = `
      SELECT
        b.id, b.category_id, b.wallet_id,
        b.amount, b.period, b.start_date, b.end_date,
        b.is_active, b.created_at, b.updated_at,
        c.name  AS category_name,
        c.type  AS category_type,
        c.icon,
        c.color
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      WHERE b.period    = ?
        AND b.is_active = 1
        ${walletFilter}
      ORDER BY c.name
    `;

    const { values } = await db.query(sql, params);
    return (values ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      is_active: Boolean(row.is_active),
    })) as BudgetWithCategory[];
  }

  async getBudgetById(budgetId: string): Promise<Budget | null> {
    const db = await getDbConnection();
    const sql = `SELECT * FROM budgets WHERE id = ? LIMIT 1`;
    const { values } = await db.query(sql, [budgetId]);
    if (!values || values.length === 0) return null;
    const row = values[0] as Record<string, unknown>;
    return { ...row, is_active: Boolean(row.is_active) } as Budget;
  }

  async upsertBudget(dto: CreateBudgetDto): Promise<void> {
    const db = await getDbConnection();
    const now = Date.now();
    const id = generateId();

    // Deactivate budget cũ cùng category + wallet + period trước khi tạo mới
    const deactivateSql = `
      UPDATE budgets
      SET is_active = 0, updated_at = ?
      WHERE category_id = ?
        AND period      = ?
        AND is_active   = 1
        AND (wallet_id = ? OR (wallet_id IS NULL AND ? IS NULL))
    `;
    await db.run(deactivateSql, [
      now,
      dto.category_id,
      dto.period,
      dto.wallet_id ?? null,
      dto.wallet_id ?? null,
    ]);

    const insertSql = `
      INSERT INTO budgets
        (id, category_id, wallet_id, amount, period, start_date, end_date, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;
    await db.run(insertSql, [
      id,
      dto.category_id,
      dto.wallet_id ?? null,
      dto.amount,
      dto.period,
      dto.start_date,
      dto.end_date ?? null,
      now,
      now,
    ]);
  }

  async deactivateBudget(budgetId: string): Promise<void> {
    const db = await getDbConnection();
    const sql = `
      UPDATE budgets
      SET is_active = 0, updated_at = ?
      WHERE id = ?
    `;
    await db.run(sql, [Date.now(), budgetId]);
  }

  async getSpentAmount(
    categoryId: string,
    startDate: number,
    endDate: number,
    walletId?: string
  ): Promise<number> {
    const db = await getDbConnection();

    const walletFilter = walletId ? 'AND wallet_id = ?' : '';
    const params: unknown[] = [categoryId, startDate, endDate];
    if (walletId) params.push(walletId);

    const sql = `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE category_id      = ?
        AND transaction_date >= ?
        AND transaction_date <= ?
        AND type             = 'expense'
        AND deleted_at       IS NULL
        ${walletFilter}
    `;

    const { values } = await db.query(sql, params);
    return (values?.[0]?.total as number) ?? 0;
  }
}
