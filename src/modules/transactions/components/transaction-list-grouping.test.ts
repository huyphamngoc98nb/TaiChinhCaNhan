import { describe, expect, it } from 'vitest';
import type { Transaction } from '../domain/transaction.model';
import {
  buildDailySummaryRows,
  buildQuarterSummaryRows,
  buildWeeklySummaryRows,
  sortTransactionsNewestFirst,
  summarizeTransactions,
} from './transaction-list-grouping';

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  const timestamp = new Date(2026, 6, 15, 12, 0).getTime();

  return {
    id: 'transaction-1',
    wallet_id: 'wallet-1',
    category_id: 'category-1',
    type: 'expense',
    amount: 100,
    note: null,
    to_wallet_id: null,
    transaction_date: timestamp,
    exclude_from_total: false,
    is_budget_offset: false,
    offset_budget_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    ...overrides,
  };
}

describe('transaction list grouping', () => {
  it('sorts newest first without mutating the input array', () => {
    const older = transaction({
      id: 'older',
      transaction_date: new Date(2026, 6, 14).getTime(),
    });
    const newer = transaction({
      id: 'newer',
      transaction_date: new Date(2026, 6, 16).getTime(),
    });
    const input = [older, newer];

    expect(sortTransactionsNewestFirst(input).map((item) => item.id)).toEqual(['newer', 'older']);
    expect(input.map((item) => item.id)).toEqual(['older', 'newer']);
  });

  it('counts excluded and budget-offset transactions without adding them to totals', () => {
    const summary = summarizeTransactions([
      transaction({ id: 'expense', type: 'expense', amount: 400 }),
      transaction({ id: 'income', type: 'income', amount: 1_000 }),
      transaction({ id: 'excluded', type: 'expense', amount: 200, exclude_from_total: true }),
      transaction({ id: 'offset', type: 'income', amount: 300, is_budget_offset: true }),
      transaction({ id: 'transfer', type: 'transfer', amount: 500 }),
    ]);

    expect(summary).toEqual({
      count: 5,
      income: 1_000,
      expense: 400,
      balance: 600,
    });
  });

  it('builds local day ranges with start-of-day and end-of-day boundaries', () => {
    const timestamp = new Date(2026, 6, 15, 12, 30).getTime();
    const rows = buildDailySummaryRows(
      [transaction({ transaction_date: timestamp })],
      () => '15/07/2026',
    );

    expect(rows).toHaveLength(1);
    expect(new Date(rows[0].startDate)).toEqual(new Date(2026, 6, 15, 0, 0, 0, 0));
    expect(new Date(rows[0].endDate)).toEqual(new Date(2026, 6, 15, 23, 59, 59, 999));
  });

  it('builds week rows with drill-down day rows', () => {
    const firstDay = new Date(2026, 6, 13, 10).getTime();
    const secondDay = new Date(2026, 6, 14, 10).getTime();
    const rows = buildWeeklySummaryRows(
      [
        transaction({ id: 'first', transaction_date: firstDay }),
        transaction({ id: 'second', transaction_date: secondDay, type: 'income', amount: 500 }),
      ],
      (date) => {
        const start = new Date(date);
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);
        return start;
      },
      (date) => {
        const end = new Date(date);
        end.setDate(end.getDate() + (7 - (end.getDay() || 7)));
        end.setHours(23, 59, 59, 999);
        return end;
      },
      () => 'Week',
      (item) => String(new Date(item.transaction_date).getDate()),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].dayRows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ count: 2, income: 500, expense: 100, balance: 400 });
  });

  it('builds quarter rows with month drill-down ranges', () => {
    const rows = buildQuarterSummaryRows(
      [
        transaction({ id: 'july', transaction_date: new Date(2026, 6, 15).getTime() }),
        transaction({ id: 'august', transaction_date: new Date(2026, 7, 15).getTime() }),
      ],
      (quarter) => `Quarter ${quarter}`,
      (timestamp) => String(new Date(timestamp).getMonth() + 1),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('Quarter 3');
    expect(rows[0].monthRows).toHaveLength(2);
    expect(new Date(rows[0].monthRows[0].startDate).getDate()).toBe(1);
    expect(new Date(rows[0].monthRows[0].endDate).getDate()).toBe(31);
  });
});
