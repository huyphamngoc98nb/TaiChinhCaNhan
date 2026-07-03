import { getDbConnection } from '@/core/db/sqlite/connection';
import { IReportRepository } from './report.repository';
import {
  DateRange,
  ReportGranularity,
  CategorySummary,
  PeriodSummary,
  CashflowSummary,
  WalletSummary,
  BudgetReportQuery,
  BudgetReportSource,
} from '../domain/report.model';

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

    // Period buckets exclude budget-offset income; offsets are applied by aggregate/category summaries.
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

    // Budget offsets reduce reported expense without being counted as regular income.
    // Unlike regular income/expense, offsets remain effective when excluded from totals,
    // matching the expense-category report semantics.
    const sql = `
      WITH cashflow AS (
        SELECT
          COALESCE(SUM(CASE
            WHEN type = 'income'
              AND is_budget_offset = 0
              AND exclude_from_total = 0
            THEN amount ELSE 0 END), 0) as grossIncome,
          COALESCE(SUM(CASE
            WHEN type = 'expense'
              AND exclude_from_total = 0
            THEN amount ELSE 0 END), 0) as grossExpense,
          COALESCE(SUM(CASE
            WHEN type = 'income'
              AND is_budget_offset = 1
              AND offset_budget_id IS NOT NULL
            THEN amount ELSE 0 END), 0) as totalOffset
        FROM transactions
        WHERE transaction_date >= ?
          AND transaction_date <= ?
          AND type IN ('income', 'expense')
          AND deleted_at IS NULL
      )
      SELECT
        grossIncome,
        grossExpense,
        totalOffset,
        MAX(grossExpense - totalOffset, 0) as netExpense
      FROM cashflow
    `;
    const { values } = await db.query(sql, [range.startDate, range.endDate]);
    const row = values && values.length > 0 ? values[0] : null;

    const grossIncome = row?.grossIncome || 0;
    const grossExpense = row?.grossExpense || 0;
    const totalOffset = row?.totalOffset || 0;
    const netExpense = Math.max(row?.netExpense ?? grossExpense - totalOffset, 0);

    return {
      grossIncome,
      grossExpense,
      totalOffset,
      netExpense,
      totalIncome: grossIncome,
      totalExpense: netExpense,
      netAmount: grossIncome - netExpense,
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

  async getBudgetReportSource(query: BudgetReportQuery): Promise<BudgetReportSource> {
    const db = await getDbConnection();
    const { range, categoryId, walletId } = query;

    const budgetConditions = [
      'b.is_active = 1',
      "c.type = 'expense'",
      'b.start_date <= ?',
      '(b.end_date IS NULL OR b.end_date >= ?)',
    ];
    const budgetParams: unknown[] = [range.endDate, range.startDate];

    if (categoryId) {
      budgetConditions.push('b.category_id = ?');
      budgetParams.push(categoryId);
    }
    if (walletId) {
      budgetConditions.push(`(
        b.wallet_id = ?
        OR (b.wallet_id IS NULL AND b.account_type_scope IS NULL)
        OR (
          b.wallet_id IS NULL
          AND b.account_type_scope = (
            SELECT account_type FROM wallets WHERE id = ? LIMIT 1
          )
        )
      )`);
      budgetParams.push(walletId, walletId);
    }

    const budgetsResult = await db.query(
      `
        SELECT
          b.id,
          b.category_id,
          c.name AS category_name,
          b.amount,
          b.period,
          b.start_date,
          b.end_date
        FROM budgets b
        JOIN categories c ON c.id = b.category_id
        WHERE ${budgetConditions.join('\n          AND ')}
        ORDER BY c.name COLLATE NOCASE ASC
      `,
      budgetParams,
    );

    const expenseConditions = [
      "t.type = 'expense'",
      't.transaction_date >= ?',
      't.transaction_date <= ?',
      't.deleted_at IS NULL',
      't.exclude_from_total = 0',
    ];
    const expenseParams: unknown[] = [range.startDate, range.endDate];
    const offsetConditions = [
      "t.type = 'income'",
      't.is_budget_offset = 1',
      't.offset_budget_id IS NOT NULL',
      't.transaction_date >= ?',
      't.transaction_date <= ?',
      't.deleted_at IS NULL',
    ];
    const offsetParams: unknown[] = [range.startDate, range.endDate];

    if (categoryId) {
      expenseConditions.push('t.category_id = ?');
      expenseParams.push(categoryId);
      offsetConditions.push('b.category_id = ?');
      offsetParams.push(categoryId);
    }
    if (walletId) {
      expenseConditions.push('t.wallet_id = ?');
      expenseParams.push(walletId);
      offsetConditions.push('t.wallet_id = ?');
      offsetParams.push(walletId);
    }

    const movementSql = `
      SELECT
        t.category_id AS category_id,
        c.name AS category_name,
        t.transaction_date AS transaction_date,
        t.amount AS signed_amount
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE ${expenseConditions.join('\n        AND ')}

      UNION ALL

      SELECT
        b.category_id AS category_id,
        c.name AS category_name,
        t.transaction_date AS transaction_date,
        -t.amount AS signed_amount
      FROM transactions t
      JOIN budgets b ON b.id = t.offset_budget_id
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE ${offsetConditions.join('\n        AND ')}
    `;
    const movementParams = [...expenseParams, ...offsetParams];

    const [spendingResult, trendResult] = await Promise.all([
      db.query(
        `
          WITH movements AS (${movementSql})
          SELECT
            category_id,
            category_name,
            MAX(SUM(signed_amount), 0) AS actual_spending
          FROM movements
          GROUP BY category_id, category_name
          ORDER BY actual_spending DESC
        `,
        movementParams,
      ),
      db.query(
        `
          WITH movements AS (${movementSql})
          SELECT
            strftime('%Y-%m-%d', transaction_date / 1000, 'unixepoch', 'localtime') AS date,
            category_id,
            MAX(SUM(signed_amount), 0) AS actual_spending
          FROM movements
          GROUP BY date, category_id
          ORDER BY date ASC
        `,
        movementParams,
      ),
    ]);

    return {
      budgets: (budgetsResult.values ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        categoryId: row.category_id as string,
        categoryName: (row.category_name as string) || 'Uncategorized',
        amount: Number(row.amount ?? 0),
        period: row.period as 'weekly' | 'monthly',
        startDate: Number(row.start_date),
        endDate: row.end_date == null ? null : Number(row.end_date),
      })),
      spending: (spendingResult.values ?? []).map((row: Record<string, unknown>) => ({
        categoryId: row.category_id as string,
        categoryName: (row.category_name as string) || 'Uncategorized',
        actualSpending: Number(row.actual_spending ?? 0),
      })),
      trend: (trendResult.values ?? []).map((row: Record<string, unknown>) => ({
        date: row.date as string,
        categoryId: row.category_id as string,
        actualSpending: Number(row.actual_spending ?? 0),
      })),
    };
  }
}
