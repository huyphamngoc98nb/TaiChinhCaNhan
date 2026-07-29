import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../domain/transaction.model';
import { TransactionList } from './TransactionList';

const mocks = vi.hoisted(() => ({
  showAmounts: true,
  displayFormatSettings: {},
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatAmount: (amount: number) => `#${amount}`,
  }),
}));

vi.mock('@/shared/hooks/useAmountVisibility', () => ({
  HIDDEN_AMOUNT: '••••',
  useAmountVisibility: () => ({ showAmounts: mocks.showAmounts }),
}));

vi.mock('@/shared/hooks/useDisplayFormatSettings', () => ({
  useDisplayFormatSettings: () => mocks.displayFormatSettings,
}));

vi.mock('@/shared/utils/locale', () => ({
  getAppLocale: () => 'en-US',
}));

vi.mock('@/shared/utils/display-format', () => ({
  formatAppDate: (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  },
  formatAppMonth: (timestamp: number) => {
    const date = new Date(timestamp);
    return `Month-${date.getMonth() + 1}`;
  },
  getStartOfWeek: (date: Date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return start;
  },
  getEndOfWeek: (date: Date) => {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() + (6 - end.getDay()));
    return end;
  },
}));

vi.mock('./TransactionItem', () => ({
  TransactionItem: ({
    transaction,
    onSelect,
  }: {
    transaction: Transaction;
    onSelect: (id: string) => void;
  }) => (
    <button type="button" onClick={() => onSelect(transaction.id)}>
      item-{transaction.id}
    </button>
  ),
}));

function makeTransaction(
  id: string,
  type: Transaction['type'],
  amount: number,
  transactionDate: number,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    wallet_id: 'wallet-1',
    category_id: 'cat-food',
    type,
    amount,
    note: null,
    to_wallet_id: null,
    transaction_date: transactionDate,
    exclude_from_total: false,
    is_budget_offset: false,
    offset_budget_id: null,
    created_at: transactionDate,
    updated_at: transactionDate,
    deleted_at: null,
    ...overrides,
  };
}

describe('TransactionList behavior', () => {
  beforeEach(() => {
    mocks.showAmounts = true;
  });

  it('renders a structural loading state and a differentiated filtered empty state', () => {
    const { rerender } = render(
      <TransactionList transactions={[]} loading onSelect={vi.fn()} />
    );

    expect(screen.getByRole('status').getAttribute('aria-label'))
      .toBe('transactions.loading_history');

    rerender(
      <TransactionList
        transactions={[]}
        loading={false}
        onSelect={vi.fn()}
        emptyVariant="filtered"
        emptyMessage="No match"
        emptyDescription="Clear filters"
      />
    );

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('No match');
    expect(screen.getByText('Clear filters')).toBeTruthy();
  });

  it('keeps every record in the day count while excluding flagged amounts from totals', () => {
    const date = new Date(2026, 6, 10, 12).getTime();
    const onSelect = vi.fn();
    const transactions = [
      makeTransaction('expense', 'expense', 50, date),
      makeTransaction('excluded', 'expense', 30, date, { exclude_from_total: true }),
      makeTransaction('offset', 'income', 100, date, { is_budget_offset: true }),
      makeTransaction('income', 'income', 200, date),
    ];

    render(
      <TransactionList
        transactions={transactions}
        loading={false}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('4 transactions.records_many')).toBeTruthy();
    expect(screen.getByText('transactions.label_income #200')).toBeTruthy();
    expect(screen.getByText('transactions.label_expense #50')).toBeTruthy();
    expect(screen.getByText('transactions.label_balance #150')).toBeTruthy();

    fireEvent.click(screen.getByText('item-expense'));
    expect(onSelect).toHaveBeenCalledWith('expense');
  });

  it('never exposes summary numbers while amount visibility is off', () => {
    mocks.showAmounts = false;
    const date = new Date(2026, 6, 10, 12).getTime();

    const { container } = render(
      <TransactionList
        transactions={[makeTransaction('income', 'income', 987_654, date)]}
        loading={false}
        onSelect={vi.fn()}
      />
    );

    expect(container.textContent).toContain('••••');
    expect(container.textContent).not.toContain('987654');
  });

  it('expands a week and drills into the selected day range', () => {
    const onSelectSummaryRange = vi.fn();
    const date = new Date(2024, 0, 8, 12).getTime();

    render(
      <TransactionList
        transactions={[makeTransaction('expense', 'expense', 50, date)]}
        loading={false}
        onSelect={vi.fn()}
        onSelectSummaryRange={onSelectSummaryRange}
        viewType="month"
      />
    );

    const weekToggle = screen.getByRole('button', { expanded: false });
    fireEvent.click(weekToggle);
    fireEvent.click(screen.getByLabelText(/transactions\.open_day_detail/));

    expect(onSelectSummaryRange).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Mon 2024-1-8',
    }));
  });

  it('expands a quarter and drills into the selected month range', () => {
    const onSelectSummaryRange = vi.fn();
    const date = new Date(2024, 1, 8, 12).getTime();

    render(
      <TransactionList
        transactions={[makeTransaction('income', 'income', 50, date)]}
        loading={false}
        onSelect={vi.fn()}
        onSelectSummaryRange={onSelectSummaryRange}
        viewType="year"
      />
    );

    fireEvent.click(screen.getByRole('button', { expanded: false }));
    fireEvent.click(screen.getByLabelText(/transactions\.open_month_detail/));

    expect(onSelectSummaryRange).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Month-2 2024',
    }));
  });
});
