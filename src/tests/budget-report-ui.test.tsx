import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { LanguageProvider } from '@/shared/context/LanguageContext';
import { BudgetReportEmptyStates } from '@/modules/reports/components/BudgetReportEmptyStates';
import { BudgetReportFilters } from '@/modules/reports/components/BudgetReportFilters';
import { BudgetMonthNavigator } from '@/modules/reports/components/BudgetMonthNavigator';
import { BudgetReportSummary } from '@/modules/reports/components/BudgetReportSummary';
import { ReportTypeTabs } from '@/modules/reports/components/ReportTypeTabs';
import type { BudgetReport, BudgetReportStatus } from '@/modules/reports/domain/report.model';
import type { DateRangePreset } from '@/modules/reports/services/build-date-range';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: 'en' })),
    set: vi.fn(async () => undefined),
  },
}));

const report: BudgetReport = {
  period: { startDate: 1, endDate: 2 },
  summary: {
    totalBudget: 100,
    totalActualSpending: 120,
    remainingAmount: 0,
    overspentAmount: 20,
    usagePercentage: 120,
    status: 'OVER_BUDGET',
  },
  categories: [],
  trend: [],
  trendGranularity: 'day',
  hasBudget: true,
  hasSpending: true,
};

function renderWithLanguage(ui: React.ReactElement) {
  vi.mocked(Preferences.get).mockResolvedValue({ value: 'en' });
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function StatefulFilters() {
  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'' | BudgetReportStatus>('');

  return (
    <BudgetReportFilters
      preset={preset}
      customRange={{ startDate: new Date(2026, 0, 1).getTime(), endDate: new Date(2026, 0, 31).getTime() }}
      categoryId={categoryId}
      walletId=""
      status={status}
      categories={[{ id: 'food', name: 'Food' } as never]}
      wallets={[]}
      onPresetChange={setPreset}
      onCustomRangeChange={vi.fn()}
      onCategoryChange={setCategoryId}
      onWalletChange={vi.fn()}
      onStatusChange={setStatus}
    />
  );
}

describe('Budget Report UI', () => {
  it('renders summary values and over-budget status', async () => {
    renderWithLanguage(<BudgetReportSummary report={report} displayAmount={(value) => `$${value}`} />);

    expect(await screen.findByText('Total budget')).toBeTruthy();
    expect(screen.getByText('$120')).toBeTruthy();
    expect(screen.getByText('120.0%')).toBeTruthy();
    expect(screen.getByText('OVER')).toBeTruthy();
  });

  it('renders both no-budget and no-spending empty states', async () => {
    renderWithLanguage(<BudgetReportEmptyStates hasBudget={false} hasSpending={false} onConfigureBudget={vi.fn()} />);

    expect(await screen.findByText('No budget has been configured for this period.')).toBeTruthy();
    expect(screen.getByText('No spending transactions found for this period.')).toBeTruthy();
  });

  it('applies period, category, and status filters', async () => {
    renderWithLanguage(<StatefulFilters />);

    fireEvent.click(await screen.findByRole('button', { name: 'Today' }));
    const categoryDropdown = screen.getByRole('button', { name: 'Category' });
    fireEvent.click(categoryDropdown);
    fireEvent.click(screen.getByRole('option', { name: 'Food' }));

    const statusDropdown = screen.getByRole('button', { name: 'Budget status' });
    fireEvent.click(statusDropdown);
    fireEvent.click(screen.getByRole('option', { name: 'Over budget' }));

    expect(screen.getByRole('button', { name: 'Today' }).className).toContain('bg-primary');
    expect(categoryDropdown.textContent).toContain('Food');
    expect(statusDropdown.textContent).toContain('Over budget');
    expect(document.activeElement).toBe(statusDropdown);
  });

  it('uses app dropdowns and keeps an empty wallet filter usable', async () => {
    const { container } = renderWithLanguage(<StatefulFilters />);

    expect(container.querySelector('select')).toBeNull();

    const walletDropdown = await screen.findByRole('button', { name: 'Wallet / account' });
    fireEvent.click(walletDropdown);

    const listbox = screen.getByRole('listbox', { name: 'Wallet / account' });
    expect(listbox).toBeTruthy();
    expect(screen.getByRole('option', { name: 'All wallets' })).toBeTruthy();
  });

  it('supports previous, next, and current-month navigation', async () => {
    const onPreviousMonth = vi.fn();
    const onNextMonth = vi.fn();
    const onCurrentMonth = vi.fn();

    renderWithLanguage(
      <BudgetMonthNavigator
        label="Month 07/2026"
        isCurrentMonth={false}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
        onCurrentMonth={onCurrentMonth}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Current month' }));

    expect(onPreviousMonth).toHaveBeenCalledOnce();
    expect(onNextMonth).toHaveBeenCalledOnce();
    expect(onCurrentMonth).toHaveBeenCalledOnce();
    expect(screen.getByText('Month 07/2026')).toBeTruthy();
  });

  it('hides the current-month shortcut while viewing the current month', async () => {
    renderWithLanguage(
      <BudgetMonthNavigator
        label="Month 07/2026"
        isCurrentMonth
        onPreviousMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onCurrentMonth={vi.fn()}
      />,
    );

    expect(await screen.findByText('Month 07/2026')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Current month' })).toBeNull();
  });

  it('exposes budget as a tab within reports', async () => {
    const onChange = vi.fn();
    renderWithLanguage(<ReportTypeTabs active="cashflow" onChange={onChange} />);

    const budgetTab = await screen.findByRole('tab', { name: 'Budgets' });
    fireEvent.click(budgetTab);

    expect(onChange).toHaveBeenCalledWith('budget');
    expect(budgetTab.getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('tab', { name: 'Cashflow' }).getAttribute('aria-selected')).toBe('true');
  });
});
