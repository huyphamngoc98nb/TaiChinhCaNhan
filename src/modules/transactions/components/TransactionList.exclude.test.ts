import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/modules/transactions/domain/transaction.model';

interface SummaryRow {
  key: string;
  label: string;
  count: number;
  income: number;
  expense: number;
}

function addTransactionAmount(row: SummaryRow, tx: Transaction) {
  row.count += 1;
  if (tx.exclude_from_total) return;
  if (tx.type === 'income') row.income += tx.amount;
  else if (tx.type === 'expense') row.expense += tx.amount;
}

function makeRow(): SummaryRow {
  return { key: 'test', label: 'Test', count: 0, income: 0, expense: 0 };
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  const now = Date.now();
  return {
    id: 'tx-1',
    wallet_id: 'w-1',
    category_id: 'cat-1',
    type: 'expense',
    amount: 50_000,
    note: null,
    to_wallet_id: null,
    transaction_date: now,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    exclude_from_total: false,
    ...overrides,
  };
}

describe('addTransactionAmount - exclude_from_total', () => {
  it('adds expense amount when exclude_from_total = false', () => {
    const row = makeRow();
    addTransactionAmount(row, makeTx({ type: 'expense', amount: 50_000 }));
    expect(row.expense).toBe(50_000);
    expect(row.income).toBe(0);
    expect(row.count).toBe(1);
  });

  it('adds income amount when exclude_from_total = false', () => {
    const row = makeRow();
    addTransactionAmount(row, makeTx({ type: 'income', amount: 80_000 }));
    expect(row.income).toBe(80_000);
    expect(row.expense).toBe(0);
    expect(row.count).toBe(1);
  });

  it('does not add expense when exclude_from_total = true', () => {
    const row = makeRow();
    addTransactionAmount(row, makeTx({ type: 'expense', amount: 50_000, exclude_from_total: true }));
    expect(row.expense).toBe(0);
    expect(row.income).toBe(0);
  });

  it('does not add income when exclude_from_total = true', () => {
    const row = makeRow();
    addTransactionAmount(row, makeTx({ type: 'income', amount: 80_000, exclude_from_total: true }));
    expect(row.income).toBe(0);
    expect(row.expense).toBe(0);
  });

  it('still increments count when exclude_from_total = true', () => {
    const row = makeRow();
    addTransactionAmount(row, makeTx({ exclude_from_total: true }));
    expect(row.count).toBe(1);
  });

  it('accumulates correctly across mixed flagged and normal transactions', () => {
    const row = makeRow();
    addTransactionAmount(row, makeTx({ type: 'expense', amount: 50_000 }));
    addTransactionAmount(row, makeTx({ type: 'expense', amount: 30_000, exclude_from_total: true }));
    addTransactionAmount(row, makeTx({ type: 'income', amount: 100_000 }));
    addTransactionAmount(row, makeTx({ type: 'income', amount: 20_000, exclude_from_total: true }));

    expect(row.count).toBe(4);
    expect(row.expense).toBe(50_000);
    expect(row.income).toBe(100_000);
  });
});
