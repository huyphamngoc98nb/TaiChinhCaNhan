import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransactionFilter } from '../domain/transaction.model';
import { getMonthDateRange } from '@/shared/utils/date-range';
import { TransactionsPage } from './TransactionsPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  setFilter: vi.fn(),
  locationState: null as { filter?: TransactionFilter; title?: string } | null,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ state: mocks.locationState }),
}));

vi.mock('@/shared/components/BackButton', () => ({
  BackButton: ({ onClick, ariaLabel }: { onClick: () => void; ariaLabel: string }) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel}>Back</button>
  ),
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

vi.mock('@/modules/wallets/hooks/useWallets', () => ({
  useWallets: () => ({
    wallets: [{ id: 'wallet-1', name: 'Cash' }],
  }),
}));

vi.mock('@/modules/categories/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [{ id: 'category-1', name: 'Food', type: 'expense' }],
  }),
}));

vi.mock('@/shared/hooks/useDisplayFormatSettings', () => ({
  useDisplayFormatSettings: () => ({}),
}));

vi.mock('@/shared/utils/display-format', () => ({
  formatAppDate: (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  },
  formatAppMonth: (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  },
}));

vi.mock('../hooks/useTransactions', () => ({
  useTransactions: (initialFilter: TransactionFilter) => {
    const [filter, setFilterState] = useState(initialFilter);
    const setFilter = (next: TransactionFilter | ((current: TransactionFilter) => TransactionFilter)) => {
      mocks.setFilter(next);
      setFilterState((current) => (
        typeof next === 'function' ? next(current) : next
      ));
    };

    return {
      transactions: [],
      loading: false,
      filter,
      setFilter,
    };
  },
}));

vi.mock('../components/AdvancedTransactionFilterSheet', () => ({
  AdvancedTransactionFilterSheet: () => null,
}));

vi.mock('../components/TransactionList', () => ({
  TransactionList: ({
    viewType,
    onSelectSummaryRange,
    emptyAction,
  }: {
    viewType: string;
    onSelectSummaryRange: (range: { startDate: number; endDate: number; title: string }) => void;
    emptyAction: ReactNode;
  }) => (
    <div>
      <span data-testid="view-type">{viewType}</span>
      <button
        type="button"
        onClick={() => onSelectSummaryRange({
          startDate: new Date(2026, 5, 10).getTime(),
          endDate: new Date(2026, 5, 10, 23, 59, 59, 999).getTime(),
          title: 'Day detail',
        })}
      >
        Drill down
      </button>
      {emptyAction}
    </div>
  ),
}));

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 29, 12));
    vi.clearAllMocks();
    mocks.locationState = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the current month in day view and disables future navigation', () => {
    render(<TransactionsPage />);

    expect(screen.getByRole('heading', { level: 1 }).textContent)
      .toBe('transactions.history_title');
    expect(screen.getByTestId('view-type').textContent).toBe('day');
    expect((screen.getByLabelText('transactions.next_month') as HTMLButtonElement).disabled)
      .toBe(true);
    expect(screen.getByLabelText('transactions.period_navigation')).toBeTruthy();
  });

  it('moves to the previous month with one click and keeps non-date filters', () => {
    mocks.locationState = {
      filter: {
        ...getMonthDateRange('2026-07'),
        wallet_id: 'wallet-1',
      },
    };
    render(<TransactionsPage />);

    fireEvent.click(screen.getByLabelText('transactions.previous_month'));

    expect(mocks.setFilter).toHaveBeenCalledTimes(1);
    const update = mocks.setFilter.mock.calls[0][0] as (current: TransactionFilter) => TransactionFilter;
    expect(update({
      ...getMonthDateRange('2026-07'),
      wallet_id: 'wallet-1',
    })).toEqual({
      ...getMonthDateRange('2026-06'),
      wallet_id: 'wallet-1',
    });
  });

  it('switches day, month and year views without changing the date filter', () => {
    render(<TransactionsPage />);

    fireEvent.click(screen.getByText('transactions.view_month'));
    expect(screen.getByTestId('view-type').textContent).toBe('month');

    fireEvent.click(screen.getByText('transactions.view_year'));
    expect(screen.getByTestId('view-type').textContent).toBe('year');
    expect(mocks.setFilter).not.toHaveBeenCalled();
  });

  it('restores the previous list snapshot before navigating home from a drill-down', () => {
    render(<TransactionsPage />);

    fireEvent.click(screen.getByText('transactions.view_month'));
    fireEvent.click(screen.getByText('Drill down'));

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Day detail');
    expect(screen.queryByLabelText('transactions.period_navigation')).toBeNull();

    fireEvent.click(screen.getByLabelText('common.back'));

    expect(screen.getByTestId('view-type').textContent).toBe('month');
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
