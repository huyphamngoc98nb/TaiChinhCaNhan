import { getDbConnection } from '@/core/db/sqlite/connection';

export async function explainReportQueries() {
  const db = await getDbConnection();
  const results = [];

  const queries = [
    {
      name: 'Category Summary',
      sql: `EXPLAIN QUERY PLAN 
            SELECT category_id, SUM(amount) as amount, type 
            FROM transactions 
            WHERE type = ? AND transaction_date >= ? AND transaction_date <= ? AND deleted_at IS NULL 
            GROUP BY category_id ORDER BY amount DESC`,
      params: ['expense', 0, 9999999999999]
    },
    {
      name: 'Period Summary',
      sql: `EXPLAIN QUERY PLAN 
            SELECT strftime(?, transaction_date / 1000, 'unixepoch') as period,
                   SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                   SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
            FROM transactions
            WHERE transaction_date >= ? AND transaction_date <= ? AND type IN ('income', 'expense') AND deleted_at IS NULL
            GROUP BY period ORDER BY period ASC`,
      params: ['%Y-%m', 0, 9999999999999]
    },
    {
      name: 'Cashflow Summary',
      sql: `EXPLAIN QUERY PLAN 
            SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
                   SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense
            FROM transactions
            WHERE transaction_date >= ? AND transaction_date <= ? AND type IN ('income', 'expense') AND deleted_at IS NULL`,
      params: [0, 9999999999999]
    }
  ];

  for (const q of queries) {
    try {
      const { values } = await db.query(q.sql, q.params);
      results.push({
        name: q.name,
        plan: values || []
      });
    } catch (e: any) {
      results.push({ name: q.name, error: e.message });
    }
  }

  return results;
}
