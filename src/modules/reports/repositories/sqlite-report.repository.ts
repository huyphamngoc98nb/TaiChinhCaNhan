import { getDbConnection } from '@/core/db/sqlite/connection';
import { IReportRepository } from './report.repository';
import { DateRange, ReportGranularity, CategorySummary, PeriodSummary, CashflowSummary, WalletSummary } from '../domain/report.model';

export class SQLiteReportRepository implements IReportRepository {
  async getCategorySummary(range: DateRange, type: 'income' | 'expense'): Promise<CategorySummary[]> {
    const db = await getDbConnection();

    if (type === 'income') {
      // Income donut excludes budget-offset income because offsets reduce expense categories instead.
      const sql = `
        SELECT t.category_id, c.name as category_name, SUM(t.amount) as amount, t.type
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'income'
          AND t.transaction_date >= ?
          AND t.transaction_date <= ?
          AND t.deleted_at IS NULL
          AND t.exclude_from_total = 0
          AND t.is_budget_offset = 0
        GROUP BY t.category_id
        ORDER BY amount DESC
      `;
      const { values } = await db.query(sql, [range.startDate, range.endDate]);
      return (values || []).map((row: any) => ({
        category_id: row.category_id,
        category_name: row.category_name || 'Uncategorized',
        amount: row.amount || 0,
        type: row.type,
      }));
    }

    // Expense donut shows net expense after subtracting budget offsets by budget category.
    const sql = `
      WITH expense_by_category AS (
        SELECT
          t.category_id,
          c.name as category_name,
          SUM(t.amount) as gross_amount
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.type = 'expense'
          AND t.transaction_date >= ?
          AND t.transaction_date <= ?
          AND t.deleted_at IS NULL
          AND t.exclude_from_total = 0
        GROUP BY t.category_id
      ),
      offset_by_category AS (
        SELECT
          b.category_id,
          SUM(t.amount) as offset_amount
        FROM transactions t
        JOIN budgets b ON b.id = t.offset_budget_id
        WHERE t.type = 'income'
          AND t.is_budget_offset = 1
          AND t.offset_budget_id IS NOT NULL
          AND t.transaction_date >= ?
          AND t.transaction_date <= ?
          AND t.deleted_at IS NULL
        GROUP BY b.category_id
      ),
      net_by_category AS (
        SELECT
          e.category_id,
          e.category_name,
          MAX(e.gross_amount - COALESCE(o.offset_amount, 0), 0) as amount,
          'expense' as type
        FROM expense_by_category e
        LEFT JOIN offset_by_category o ON o.category_id = e.category_id
      )
      SELECT category_id, category_name, amount, type
      FROM net_by_category
      WHERE amount > 0
      ORDER BY amount DESC
    `;
    const { values } = await db.query(sql, [range.startDate, range.endDate, range.startDate, range.endDate]);
    return (values || []).map((row: any) => ({
      category_id: row.category_id,
      category_name: row.category_name || 'Uncategorized',
      amount: row.amount || 0,
      type: row.type,
    }));
  }

  async getPeriodSummary(range: DateRange, granularity: ReportGranularity): Promise<PeriodSummary[]> {
    const db = await getDbConnection();
    
    // Week grouping assumption:
    // %W gives week of year 00-53, starting on Monday. This aligns with standard business reporting.
    // We use SQLite's unixepoch which expects seconds, so we divide ms by 1000.
    // ISO-like date handling: '%Y-%m-%d' (day), '%Y-%W' (week), '%Y-%m' (month)
    let timeFormat = '%Y-%m-%d';
    if (granularity === 'month') {
      timeFormat = '%Y-%m';
    } else if (granularity === 'week') {
      timeFormat = '%Y-%W';
    }

    // Period cashflow still excludes budget-offset income so totals/net cashflow stay unchanged.
    const sql = `
      SELECT 
        strftime(?, transaction_date / 1000, 'unixepoch') as period,
        SUM(CASE WHEN type = 'income' AND is_budget_offset = 0 THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE transaction_date >= ? 
        AND transaction_date <= ?
        AND type IN ('income', 'expense')
        AND deleted_at IS NULL
        AND exclude_from_total = 0
        AND (type <> 'income' OR is_budget_offset = 0)
      GROUP BY period
      ORDER BY period ASC
    `;
    
    const { values } = await db.query(sql, [timeFormat, range.startDate, range.endDate]);
    return (values || []).map((row: any) => ({
      period: row.period,
      income: row.income,
      expense: row.expense,
    }));
  }

  async getCashflowSummary(range: DateRange): Promise<CashflowSummary> {
    const db = await getDbConnection();
    
    // Cashflow totals still exclude budget-offset income so summary cards/net cashflow stay unchanged.
    const sql = `
      SELECT 
        SUM(CASE WHEN type = 'income' AND is_budget_offset = 0 THEN amount ELSE 0 END) as totalIncome,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense
      FROM transactions
      WHERE transaction_date >= ? 
        AND transaction_date <= ?
        AND type IN ('income', 'expense')
        AND deleted_at IS NULL
        AND exclude_from_total = 0
        AND (type <> 'income' OR is_budget_offset = 0)
    `;
    const { values } = await db.query(sql, [range.startDate, range.endDate]);
    const row = values && values.length > 0 ? values[0] : null;
    
    const totalIncome = row?.totalIncome || 0;
    const totalExpense = row?.totalExpense || 0;
    
    return {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense
    };
  }

  async getWalletSummary(range: DateRange): Promise<WalletSummary[]> {
    const db = await getDbConnection();
    const sql = `
      SELECT t.wallet_id, w.name as wallet_name, SUM(t.amount) as amount
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      WHERE t.type = 'expense'
        AND t.transaction_date >= ?
        AND t.transaction_date <= ?
        AND t.deleted_at IS NULL
        AND t.exclude_from_total = 0
      GROUP BY t.wallet_id
      ORDER BY amount DESC
    `;

    const { values } = await db.query(sql, [range.startDate, range.endDate]);
    return (values || []).map((row: any) => ({
      wallet_id: row.wallet_id,
      wallet_name: row.wallet_name || 'Unknown wallet',
      amount: row.amount || 0,
    }));
  }
}
