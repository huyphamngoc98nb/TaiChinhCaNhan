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

  it('keeps only the top app bar inside the sticky header', () => {
    mocks.locationState = {
      filter: {
        ...getMonthDateRange('2026-07'),
        wallet_id: 'wallet-1',
      },
    };
    const { container } = render(<TransactionsPage />);
    const header = container.querySelector('.transactions-history-header');
    const controls = container.querySelector('.transactions-history-controls');
    const activeFilters = container.querySelector('.transactions-active-filters');
    const period = screen.getByLabelText('transactions.period_navigation');
    const viewSwitcher = screen.getByLabelText('transactions.view_selector');

    expect(header).toBeTruthy();
    expect(controls).toBeTruthy();
    expect(activeFilters).toBeTruthy();
    expect(header?.contains(period)).toBe(false);
    expect(header?.contains(viewSwitcher)).toBe(false);
    expect(header?.contains(activeFilters)).toBe(false);
    expect(controls?.contains(period)).toBe(true);
    expect(controls?.contains(viewSwitcher)).toBe(true);
    expect(controls?.contains(activeFilters)).toBe(true);
  });

  it('expands a custom date range without forcing it into the compact month width', () => {
    mocks.locationState = {
      filter: {
        startDate: new Date(2026, 5, 10).getTime(),
        endDate: new Date(2026, 5, 20, 23, 59, 59, 999).getTime(),
      },
    };
    const { container } = render(<TransactionsPage />);
    const controlsRow = container.querySelector('.transactions-history-controls__row');
    const period = screen.getByLabelText('transactions.period_navigation');

    expect(controlsRow?.getAttribute('data-custom-period')).toBe('true');
    expect(period.getAttribute('data-custom-period')).toBe('true');
  });

  it('keeps history controls equal-width and aligned with financial summaries', () => {
    const css = readFileSync(resolve(
      process.cwd(),
      'src/modules/transactions/pages/TransactionsPage.css',
    ), 'utf8');
    const headerRule = css.match(/\.transactions-history-header\s*\{([^}]*)\}/)?.[1];
    const controlsRule = css.match(/\.transactions-history-controls\s*\{([^}]*)\}/)?.[1];
    const controlsRowRule = css.match(
      /\.transactions-history-controls__row\s*\{([^}]*)\}/,
    )?.[1];
    const periodRule = css.match(/\.transactions-period\s*\{([^}]*)\}/)?.[1];
    const periodButtonRule = css.match(
      /\.transactions-period__button\s*\{([^}]*)\}/,
    )?.[1];
    const periodButtonDisabledRule = css.match(
      /\.transactions-period__button:disabled\s*\{([^}]*)\}/,
    )?.[1];
    const periodButtonIconRule = css.match(
      /\.transactions-period__button svg\s*\{([^}]*)\}/,
    )?.[1];
    const compactControlsRule = css.match(
      /\.transactions-period,\s*\.transactions-view-switcher\s*\{([^}]*)\}/,
    )?.[1];
    const switcherRule = Array.from(
      css.matchAll(/\.transactions-view-switcher\s*\{([^}]*)\}/g),
      (match) => match[1],
    ).find((rule) => rule.includes('grid-template-columns'));
    const buttonRule = css.match(/\.transactions-view-switcher__button\s*\{([^}]*)\}/)?.[1];
    const selectedButtonRule = css.match(
      /\.transactions-view-switcher__button\[aria-pressed='true'\]\s*\{([^}]*)\}/,
    )?.[1];
    const selectedButtonInsetRule = css.match(
      /\.transactions-view-switcher__button\[aria-pressed='true'\]::before\s*\{([^}]*)\}/,
    )?.[1];
    const incomeRule = css.match(
      /\.transaction-summary-metrics__item--income\s*\{([^}]*)\}/,
    )?.[1];
    const expenseRule = css.match(
      /\.transaction-summary-metrics__item--expense\s*\{([^}]*)\}/,
    )?.[1];
    const balanceRule = css.match(
      /\.transaction-summary-metrics__item--balance\s*\{([^}]*)\}/,
    )?.[1];

    expect(headerRule).toContain('position: sticky');
    expect(controlsRule).not.toContain('position: sticky');
    expect(controlsRule).toContain('display: grid');
    expect(controlsRule).toContain('gap: 8px');
    expect(controlsRule).toContain('padding-block: 8px 10px');
    expect(controlsRule).toContain('padding-inline: 16px');
    expect(controlsRowRule).toContain('width: 100%');
    expect(controlsRowRule).toContain('max-width: none');
    expect(controlsRowRule).toContain('display: grid');
    expect(controlsRowRule).toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr))',
    );
    expect(controlsRowRule).toContain('align-items: stretch');
    expect(controlsRowRule).toContain('gap: 8px');
    expect(controlsRowRule).toContain('margin: 0');
    expect(compactControlsRule).toContain('width: 100%');
    expect(compactControlsRule).toContain('min-width: 0');
    expect(compactControlsRule).toContain('max-width: none');
    expect(compactControlsRule).toContain('height: 44px');
    expect(compactControlsRule).toContain('min-height: 44px');
    expect(compactControlsRule).toContain('box-sizing: border-box');
    expect(compactControlsRule).toContain('margin: 0');
    expect(compactControlsRule).toContain('justify-self: stretch');

    expect(periodRule).toContain('width: 100%');
    expect(periodRule).toContain('max-width: none');
    expect(periodRule).toContain('min-width: 0');
    expect(periodRule).toContain('grid-template-columns: 44px minmax(0, 1fr) 44px');
    expect(periodButtonRule).toContain('width: 44px');
    expect(periodButtonRule).toContain('height: 100%');
    expect(periodButtonRule).toContain('min-width: 44px');
    expect(periodButtonRule).toContain('min-height: 0');
    expect(periodButtonRule).toContain('align-self: stretch');
    expect(periodButtonRule).toContain('place-items: center');
    expect(periodButtonRule).toContain('padding: 0');
    expect(periodButtonRule).toContain('border-radius: 0');
    expect(periodButtonRule).toContain('background: var(--surface-muted)');
    expect(periodButtonDisabledRule).toContain('background: var(--surface-muted)');
    expect(periodButtonDisabledRule).toContain('color: var(--text-subtle)');
    expect(periodButtonIconRule).toContain('width: 18px');
    expect(periodButtonIconRule).toContain('height: 18px');
    expect(periodButtonIconRule).toContain('display: block');
    expect(periodButtonIconRule).toContain('margin: 0');
    expect(css).not.toContain(':has(');
    expect(css).not.toMatch(
      /\.transactions-history-controls__row\s*\{[^}]*justify-content:\s*space-between/,
    );

    expect(switcherRule).toContain('width: 100%');
    expect(switcherRule).toContain('min-width: 0');
    expect(switcherRule).toContain('max-width: none');
    expect(switcherRule).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(switcherRule).toContain('justify-self: stretch');
    expect(switcherRule).toContain('gap: 2px');
    expect(switcherRule).toContain('padding: 0');
    expect(switcherRule).toContain('overflow: hidden');

    expect(buttonRule).toContain('position: relative');
    expect(buttonRule).toContain('isolation: isolate');
    expect(buttonRule).toContain('width: 100%');
    expect(buttonRule).toContain('height: 44px');
    expect(buttonRule).toContain('min-width: 0');
    expect(buttonRule).toContain('min-height: 44px');
    expect(buttonRule).toContain('padding: 0 4px');
    expect(buttonRule).toContain('border: 0');
    expect(buttonRule).toContain('font-size: 13px');
    expect(buttonRule).toContain('white-space: nowrap');
    expect(selectedButtonRule).toContain('color: var(--selected-text)');
    expect(selectedButtonInsetRule).toContain("content: ''");
    expect(selectedButtonInsetRule).toContain('position: absolute');
    expect(selectedButtonInsetRule).toContain('inset: 2px');
    expect(selectedButtonInsetRule).toContain('z-index: -1');
    expect(selectedButtonInsetRule).toContain('border: 1px solid var(--selected-border)');
    expect(selectedButtonInsetRule).toContain('border-radius: 8px');
    expect(selectedButtonInsetRule).toContain('background: var(--surface)');
    expect(css).not.toMatch(
      /\.transactions-view-switcher__button:active[^}]*translateY/,
    );

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
