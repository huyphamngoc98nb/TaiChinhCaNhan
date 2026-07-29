import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../domain/transaction.model';
import { TransactionItem } from './TransactionItem';

const mocks = vi.hoisted(() => ({
  showAmounts: true,
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatAmount: (value: number) => `$${value}`,
  }),
}));

vi.mock('@/shared/hooks/useAmountVisibility', () => ({
  HIDDEN_AMOUNT: '••••',
  useAmountVisibility: () => ({
    showAmounts: mocks.showAmounts,
  }),
}));

vi.mock('@/shared/hooks/useDisplayFormatSettings', () => ({
  useDisplayFormatSettings: () => ({}),
}));

vi.mock('@/shared/hooks/useUiPersonalizationSettings', () => ({
  useUiPersonalizationSettings: () => ({
    listDensity: 'compact',
  }),
}));

vi.mock('@/shared/utils/display-format', () => ({
  formatAppDate: () => 'DATE',
  formatAppTime: () => 'TIME',
}));

vi.mock('@/modules/categories/components/CategoryIcon', () => ({
  CategoryIcon: () => <span>ICON</span>,
}));

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-1',
    wallet_id: 'wallet-1',
    category_id: 'category-1',
    type: 'expense',
    amount: 100,
    note: 'Lunch',
    to_wallet_id: null,
    transaction_date: new Date(2026, 6, 15, 12).getTime(),
    exclude_from_total: false,
    is_budget_offset: false,
    offset_budget_id: null,
    created_at: 0,
    updated_at: 0,
    deleted_at: null,
    category_name: 'Food',
    wallet_name: 'Cash',
    ...overrides,
  };
}

describe('TransactionItem behavior', () => {
  beforeEach(() => {
    mocks.showAmounts = true;
  });

  it('shows explicit financial direction for expense, income and transfer rows', () => {
    const { rerender } = render(
      <TransactionItem transaction={transaction()} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('−$100')).toBeTruthy();

    rerender(
      <TransactionItem
        transaction={transaction({ type: 'income' })}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('+$100')).toBeTruthy();

    rerender(
      <TransactionItem
        transaction={transaction({
          type: 'transfer',
          to_wallet_id: 'wallet-2',
          to_wallet_name: 'Card',
        })}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('$100')).toBeTruthy();
    expect(screen.getByText('Cash → Card')).toBeTruthy();
  });

  it('renders excluded and budget-offset states as separate text badges', () => {
    render(
      <TransactionItem
        transaction={transaction({
          exclude_from_total: true,
          is_budget_offset: true,
        })}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('transactions.excluded_from_total')).toBeTruthy();
    expect(screen.getByText('transactions.budget_offset_badge')).toBeTruthy();
  });

  it('activates the full row once with the transaction id', () => {
    const onSelect = vi.fn();
    render(<TransactionItem transaction={transaction()} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('transaction-1');
  });

  it('does not expose the real amount when amount visibility is disabled', () => {
    mocks.showAmounts = false;
    render(<TransactionItem transaction={transaction({ amount: 987_654 })} onSelect={vi.fn()} />);

    const row = screen.getByRole('button');
    expect(row.textContent).toContain('••••');
    expect(row.textContent).not.toContain('987654');
    expect(row.getAttribute('aria-label')).toBeNull();
  });
});
