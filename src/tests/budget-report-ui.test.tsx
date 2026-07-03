import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { LanguageProvider } from '@/shared/context/LanguageContext';
import { BudgetReportEmptyStates } from '@/modules/reports/components/BudgetReportEmptyStates';
import { BudgetReportFilters } from '@/modules/reports/components/BudgetReportFilters';
import { BudgetReportSummary } from '@/modules/reports/components/BudgetReportSummary';
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
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'food' } });
    fireEvent.change(screen.getByLabelText('Budget status'), { target: { value: 'OVER_BUDGET' } });

    expect(screen.getByRole('button', { name: 'Today' }).className).toContain('bg-primary');
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('food');
    expect((screen.getByLabelText('Budget status') as HTMLSelectElement).value).toBe('OVER_BUDGET');
  });
});
