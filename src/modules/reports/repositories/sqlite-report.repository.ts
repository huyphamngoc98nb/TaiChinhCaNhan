import { getDbConnection } from '@/core/db/sqlite/connection';
import { IReportRepository } from './report.repository';
import { DateRange, ReportGranularity, CategorySummary, PeriodSummary, CashflowSummary } from '../domain/report.model';

export class SQLiteReportRepository implements IReportRepository {
  async getCategorySummary(range: DateRange, type: 'income' | 'expense'): Promise<CategorySummary[]> {
    const db = await getDbConnection();
    // Query explanation: Grouping by category_id to summarize amounts.
    // Joining with categories to get human-readable names.
    const sql = `
      SELECT t.category_id, c.name as category_name, SUM(t.amount) as amount, t.type
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = ? 
        AND t.transaction_date >= ? 
        AND t.transaction_date <= ?
        AND t.deleted_at IS NULL
      GROUP BY category_id
      ORDER BY amount DESC
    `;
    const { values } = await db.query(sql, [type, range.startDate, range.endDate]);
    return (values || []).map((row: any) => ({
      category_id: row.category_id,
      category_name: row.category_name || 'Uncategorized',
      amount: row.amount,
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

    // Query explanation: Grouping by formatted period string using strftime.
    // Index-friendly: idx_transactions_date (transaction_date) allows quick range filtering before applying functions.
    const sql = `
      SELECT 
        strftime(?, transaction_date / 1000, 'unixepoch') as period,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE transaction_date >= ? 
        AND transaction_date <= ?
        AND type IN ('income', 'expense')
        AND deleted_at IS NULL
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
    
    // Query explanation: Summing totals without grouping.
    // Index-friendly: idx_transactions_date efficiently narrows down to the requested range.
    const sql = `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense
      FROM transactions
      WHERE transaction_date >= ? 
        AND transaction_date <= ?
        AND type IN ('income', 'expense')
        AND deleted_at IS NULL
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
}
