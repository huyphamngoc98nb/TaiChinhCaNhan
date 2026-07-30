/// <reference types="node" />

import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

  it('keeps the view switcher compact and aligns financial summaries on mobile', () => {
    const css = readFileSync(resolve(
      process.cwd(),
      'src/modules/transactions/pages/TransactionsPage.css',
    ), 'utf8');
    const switcherRule = css.match(/\.transactions-view-switcher\s*\{([^}]*)\}/)?.[1];
    const buttonRule = css.match(/\.transactions-view-switcher__button\s*\{([^}]*)\}/)?.[1];
    const incomeRule = css.match(
      /\.transaction-summary-metrics__item--income\s*\{([^}]*)\}/,
    )?.[1];
    const expenseRule = css.match(
      /\.transaction-summary-metrics__item--expense\s*\{([^}]*)\}/,
    )?.[1];
    const balanceRule = css.match(
      /\.transaction-summary-metrics__item--balance\s*\{([^}]*)\}/,
    )?.[1];

    expect(switcherRule).toContain('width: fit-content');
    expect(switcherRule).toContain('max-width: 100%');
    expect(switcherRule).toContain('grid-template-columns: repeat(3, minmax(0, auto))');
    expect(switcherRule).toContain('justify-self: center');
    expect(switcherRule).toContain('margin-inline: auto');
    expect(switcherRule).toContain('gap: 0');
    expect(switcherRule).toContain('padding-block: 0');
    expect(switcherRule).toContain('padding-inline: 4px');

    expect(buttonRule).toContain('min-width: 64px');
    expect(buttonRule).toContain('min-height: 44px');
    expect(buttonRule).toContain('padding-inline: 10px');
    expect(buttonRule).toContain('font-size: 13px');
    expect(buttonRule).toContain('white-space: nowrap');

    expect(incomeRule).toContain('justify-self: start');
    expect(incomeRule).toContain('text-align: start');
    expect(expenseRule).toContain('justify-self: end');
    expect(expenseRule).toContain('text-align: end');
    expect(balanceRule).toContain('grid-column: 1 / -1');
    expect(balanceRule).toContain('justify-self: end');
    expect(balanceRule).toContain('text-align: end');
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
