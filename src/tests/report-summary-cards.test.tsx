import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportSummaryCards } from '@/modules/reports/components/ReportSummaryCards';
import type { CashflowSummary } from '@/modules/reports/domain/report.model';
import { CurrencyProvider } from '@/shared/context/CurrencyContext';
import { LanguageProvider } from '@/shared/context/LanguageContext';
import { HIDDEN_AMOUNT } from '@/shared/hooks/useAmountVisibility';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: 'en' })),
    set: vi.fn(async () => undefined),
  },
}));

const summary = (
  totalIncome: number,
  totalExpense: number,
): CashflowSummary => ({
  grossIncome: totalIncome,
  grossExpense: totalExpense,
  totalOffset: 0,
  netExpense: totalExpense,
  totalIncome,
  totalExpense,
  netAmount: totalIncome - totalExpense,
});

function renderSummary(
  data: CashflowSummary | null,
  previousData: CashflowSummary | null,
  loading = false,
) {
  return render(
    <LanguageProvider>
      <CurrencyProvider>
        <ReportSummaryCards
          data={data}
          previousData={previousData}
          loading={loading}
        />
      </CurrencyProvider>
    </LanguageProvider>,
  );
}

describe('ReportSummaryCards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps income and expense as supporting metrics with the existing comparisons', async () => {
    renderSummary(summary(1_000, 600), summary(500, 800));

    expect(await screen.findByText('Income')).toBeTruthy();
    expect(screen.getByText('Expense')).toBeTruthy();
    expect(screen.queryByText('Net')).toBeNull();
    expect(screen.getByText('+100%')).toBeTruthy();
    expect(screen.getByText('-25%')).toBeTruthy();
    expect(document.body.textContent).toContain('1,000');
    expect(document.body.textContent).toContain('600');
  });

  it('masks both values without putting real amounts in labels or titles', async () => {
    localStorage.setItem('dashboard_show_amounts', 'false');
    renderSummary(summary(1_000, 600), summary(500, 800));

    expect((await screen.findAllByText(HIDDEN_AMOUNT))).toHaveLength(2);
    expect(document.body.textContent).not.toContain('1,000');
    expect(document.body.textContent).not.toContain('600');
    expect(document.querySelector('[aria-label*="1,000"]')).toBeNull();
    expect(document.querySelector('[title*="1,000"]')).toBeNull();
  });

  it('uses one non-interactive skeleton without rendering fake amounts', async () => {
    const { container } = renderSummary(null, null, true);

    expect((await screen.findByText('Loading summaries...')).className).toContain('sr-only');
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });
});
