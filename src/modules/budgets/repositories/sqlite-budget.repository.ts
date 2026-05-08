import { IBudgetRepository } from './budget.repository';
import { CategoryBudget, BudgetPeriod } from '../domain/budget.model';
import { getDbConnection } from '@/core/db/sqlite/connection';

export class SQLiteBudgetRepository implements IBudgetRepository {
  async getAllCategoryBudgets(): Promise<CategoryBudget[]> {
    const db = await getDbConnection();
    const sql = `
      SELECT id as category_id, name as category_name, type, icon, color, budget_amount, budget_period
      FROM categories
      WHERE type = 'expense'
    `;
    const { values } = await db.query(sql);
    return values || [];
  }

  async getCategoryBudget(categoryId: string): Promise<CategoryBudget | null> {
    const db = await getDbConnection();
    const sql = `
      SELECT id as category_id, name as category_name, type, icon, color, budget_amount, budget_period
      FROM categories
      WHERE id = ? AND type = 'expense'
    `;
    const { values } = await db.query(sql, [categoryId]);
    if (!values || values.length === 0) return null;
    return values[0];
  }

  async upsertCategoryBudget(categoryId: string, amount: number | null, period: BudgetPeriod | null): Promise<void> {
    const db = await getDbConnection();
    const sql = `
      UPDATE categories 
      SET budget_amount = ?, budget_period = ?, updated_at = ?
      WHERE id = ?
    `;
    await db.run(sql, [amount, period, Date.now(), categoryId]);
  }

  async getSpentAmount(categoryId: string, startDate: number, endDate: number): Promise<number> {
    const db = await getDbConnection();
    const sql = `
      SELECT SUM(amount) as total
      FROM transactions
      WHERE category_id = ? 
        AND transaction_date >= ? 
        AND transaction_date <= ?
        AND deleted_at IS NULL
    `;
    const { values } = await db.query(sql, [categoryId, startDate, endDate]);
    if (!values || values.length === 0) return 0;
    return values[0].total || 0;
  }
}
