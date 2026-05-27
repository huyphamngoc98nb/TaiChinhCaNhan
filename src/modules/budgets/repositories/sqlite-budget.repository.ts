import { IBudgetRepository } from './budget.repository';
import { Budget, BudgetWithCategory, BudgetPeriod, CreateBudgetDto, AccountType } from '../domain/budget.model';
import { getDbConnection } from '@/core/db/sqlite/connection';
import { computeStartDate } from '../services/upsert-category-budget';

/**
 * MINOR-2 fix: bỏ Math.random() fallback — không đảm bảo uniqueness.
 * Thay bằng counter đếm tăng + timestamp — đủ unique trong single-user SQLite.
 * Primary: luôn dùng crypto.randomUUID() nếu available.
 */
let _idCounter = 0;
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  _idCounter += 1;
  return `${Date.now().toString(36)}-${_idCounter.toString(36)}`;
}

export class SQLiteBudgetRepository implements IBudgetRepository {
  async getActiveBudgets(
    period: BudgetPeriod,
    walletId?: string
  ): Promise<BudgetWithCategory[]> {
    const db = await getDbConnection();

    const walletFilter = walletId
      ? 'AND (b.wallet_id = ? OR b.wallet_id IS NULL)'
      : '';
    const params: unknown[] = [period];
    if (walletId) params.push(walletId);

    const sql = `
      SELECT
        b.id, b.category_id, b.wallet_id, b.account_type_scope,
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

  async getActiveBudgetsByAccountType(
    period: BudgetPeriod,
    accountType: AccountType
  ): Promise<BudgetWithCategory[]> {
    const db = await getDbConnection();
    const sql = `
      SELECT
        b.id, b.category_id, b.wallet_id, b.account_type_scope,
        b.amount, b.period, b.start_date, b.end_date,
        b.is_active, b.created_at, b.updated_at,
        c.name  AS category_name,
        c.type  AS category_type,
        c.icon,
        c.color
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      WHERE b.period              = ?
        AND b.is_active           = 1
        AND b.wallet_id           IS NULL
        AND b.account_type_scope  = ?
      ORDER BY c.name
    `;
    const { values } = await db.query(sql, [period, accountType]);
    return (values ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      is_active: Boolean(row.is_active),
    })) as BudgetWithCategory[];
  }

  async getBudgetById(budgetId: string): Promise<Budget | null> {
    const db = await getDbConnection();
    const sql = `
      SELECT id, category_id, wallet_id, account_type_scope, amount, period,
             start_date, end_date, is_active, created_at, updated_at
      FROM budgets
      WHERE id = ?
      LIMIT 1
    `;
    const { values } = await db.query(sql, [budgetId]);
    if (!values || values.length === 0) return null;
    const row = values[0] as Record<string, unknown>;
    return { ...row, is_active: Boolean(row.is_active) } as Budget;
  }

  async upsertBudget(dto: CreateBudgetDto): Promise<void> {
    const db = await getDbConnection();
    const now = Date.now();
    const id = generateId();
    const accountTypeScope = dto.account_type_scope ?? null;

    // Validation: wallet_id và account_type_scope không cùng tồn tại
    if (dto.wallet_id && accountTypeScope) {
      throw new Error('Budget không thể có cả wallet_id và account_type_scope cùng lúc.');
    }

    // The edit form models one active budget per category for the supported
    // wallet scope. Period/scope changes must replace the previous active row.
    const deactivateSql = `
      UPDATE budgets
      SET is_active = 0, updated_at = ?
      WHERE category_id = ?
        AND is_active   = 1
        AND wallet_id IS NULL
        AND (account_type_scope = ? OR (account_type_scope IS NULL AND ? IS NULL))
    `;
    await db.run(deactivateSql, [
      now,
      dto.category_id,
      accountTypeScope,
      accountTypeScope,
    ]);

    const insertSql = `
      INSERT INTO budgets
        (id, category_id, wallet_id, account_type_scope, amount, period, start_date, end_date, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;
    await db.run(insertSql, [
      id,
      dto.category_id,
      dto.wallet_id ?? null,
      accountTypeScope,
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

  async getSpentAmountByAccountType(
    categoryId: string,
    startDate: number,
    endDate: number,
    accountType: AccountType
  ): Promise<number> {
    const db = await getDbConnection();
    const sql = `
      SELECT COALESCE(SUM(t.amount), 0) AS total
      FROM transactions t
      JOIN wallets w ON w.id = t.wallet_id
      WHERE t.category_id      = ?
        AND t.transaction_date >= ?
        AND t.transaction_date <= ?
        AND t.type             = 'expense'
        AND t.deleted_at       IS NULL
        AND w.account_type     = ?
    `;
    const { values } = await db.query(sql, [categoryId, startDate, endDate, accountType]);
    return (values?.[0]?.total as number) ?? 0;
  }

  /**
   * Returns one budget row per category for the global scope only
   * (wallet_id IS NULL AND account_type_scope IS NULL).
   * Categories that have budgets only under a specific account_type_scope
   * will appear with budget_amount = null.
   * Used by BudgetSettingsPage to render the category list.
   */
  async getAllCategoryBudgets(): Promise<any[]> {
    const db = await getDbConnection();
    const sql = `
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.type,
        c.icon,
        c.color,
        b.amount as budget_amount,
        b.period as budget_period
      FROM categories c
      LEFT JOIN budgets b
        ON b.category_id = c.id
       AND b.is_active = 1
       AND b.wallet_id IS NULL
       AND b.account_type_scope IS NULL
      WHERE c.id <> 'cat-transfer'
      ORDER BY c.name
    `;
    const { values } = await db.query(sql);
    return values || [];
  }

  async upsertCategoryBudget(categoryId: string, amount: number | null, period: 'weekly' | 'monthly' | null): Promise<void> {
    const db = await getDbConnection();
    const now = Date.now();
    
    // Deactivates all budget rows for this category that are not wallet-scoped.
    // Intentionally covers both global (account_type_scope IS NULL) and
    // account_type-scoped rows — this method is only called on full budget removal.
    await db.run(
      'UPDATE budgets SET is_active = 0, updated_at = ? WHERE category_id = ? AND wallet_id IS NULL AND is_active = 1',
      [now, categoryId]
    );
    
    if (amount !== null && period !== null) {
      const id = generateId();
      const start_date = computeStartDate(period);
      
      await db.run(
        'INSERT INTO budgets (id, category_id, wallet_id, account_type_scope, amount, period, start_date, is_active, created_at, updated_at) VALUES (?, ?, NULL, NULL, ?, ?, ?, 1, ?, ?)',
        [id, categoryId, amount, period, start_date, now, now]
      );
    }
  }

  async deleteCategoryBudget(categoryId: string): Promise<void> {
    const db = await getDbConnection();
    await db.run(
      'UPDATE budgets SET is_active = 0, updated_at = ? WHERE category_id = ? AND wallet_id IS NULL AND is_active = 1',
      [Date.now(), categoryId]
    );
  }
}
