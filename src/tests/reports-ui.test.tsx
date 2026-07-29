import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { DateRangePicker } from '../modules/reports/components/DateRangePicker';
import { ReportsPage } from '../modules/reports/pages/ReportsPage';
import { LanguageProvider } from '@/shared/context/LanguageContext';
import { appRepositories } from '@/core/repositories/app-repositories';
import { useState } from 'react';
import type { DateRangePreset } from '../modules/reports/services/build-date-range';
import type { ReportGranularity } from '../modules/reports/domain/report.model';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: 'en' })),
    set: vi.fn(async () => undefined),
  },
}));

vi.mock('@/shared/context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatAmount: (value: number) => `${new Intl.NumberFormat('en-US').format(value)} ₫`,
  }),
}));

vi.mock('@/modules/reports/components/ReportSummaryCards', () => ({
  ReportSummaryCards: ({
    data,
  }: {
    data: { totalExpense: number; netAmount: number } | null;
  }) => {
    const visible = localStorage.getItem('dashboard_show_amounts') !== 'false';
    return (
      <>
        <output data-testid="report-summary-expense">
          {visible ? data?.totalExpense ?? 0 : '••••••'}
        </output>
        <output data-testid="report-summary-net">
          {visible ? data?.netAmount ?? 0 : '••••••'}
        </output>
      </>
    );
  },
}));

vi.mock('@/modules/reports/components/CashflowTrendChart', () => ({
  CashflowTrendChart: ({ data }: { data: Array<{ period: string }> }) => (
    <output data-testid="report-trend-periods">{data.map(item => item.period).join(',')}</output>
  ),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: Array<{ id: string }>;
  }) => (
    <div data-testid="reports-page-pie" data-ids={data.map(item => item.id).join(',')}>
      {children}
    </div>
  ),
  Cell: () => <span />,
}));

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  localStorage.clear();
});

function renderWithProviders(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function StatefulDateRangePicker() {
  const [preset, setPreset] = useState<DateRangePreset>('this_week');
  const [granularity, setGranularity] = useState<ReportGranularity>('week');

  return (
    <DateRangePicker
      preset={preset}
      granularity={granularity}
      customRange={{ startDate: 1, endDate: 2 }}
      onPresetChange={setPreset}
      onGranularityChange={setGranularity}
      onCustomRangeChange={vi.fn()}
      onReset={() => {
        setPreset('this_month');
        setGranularity('day');
      }}
    />
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe('Reports UI - DateRangePicker', () => {
  it('calls onPresetChange when a new preset is selected', async () => {
    const onPresetChange = vi.fn();
    const onGranularityChange = vi.fn();

    renderWithProviders(
      <DateRangePicker 
        preset="this_month" 
        granularity="day" 
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={onPresetChange} 
        onGranularityChange={onGranularityChange} 
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    fireEvent.change(
      await screen.findByRole('combobox', { name: /Time Period/i }),
      { target: { value: 'this_week' } },
    );

    expect(onPresetChange).toHaveBeenCalledWith('this_week');
  });

  it('renders last month as an active preset without custom date inputs', async () => {
    const onPresetChange = vi.fn();

    renderWithProviders(
      <DateRangePicker
        preset="last_month"
        granularity="day"
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={onPresetChange}
        onGranularityChange={vi.fn()}
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const periodSelect = await screen.findByRole('combobox', { name: /Time Period/i });

    expect((periodSelect as HTMLSelectElement).value).toBe('last_month');
    expect(screen.queryByLabelText(/Start date/i)).toBeNull();
    expect(screen.queryByLabelText(/End date/i)).toBeNull();

    fireEvent.change(periodSelect, { target: { value: 'this_week' } });
    expect(onPresetChange).toHaveBeenCalledWith('this_week');
  });

  it('calls onGranularityChange when a new granularity is selected', async () => {
    const onPresetChange = vi.fn();
    const onGranularityChange = vi.fn();

    renderWithProviders(
      <DateRangePicker 
        preset="this_month" 
        granularity="day" 
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={onPresetChange} 
        onGranularityChange={onGranularityChange} 
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const granularityGroup = await screen.findByRole('group', { name: /Group By/i });
    fireEvent.click(within(granularityGroup).getByRole('button', { name: /^Week$/i }));

    expect(onGranularityChange).toHaveBeenCalledWith('week');
  });

  it('keeps reset secondary by hiding it at defaults and showing a full target after changes', async () => {
    let view = renderWithProviders(
      <DateRangePicker
        preset="this_month"
        granularity="day"
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={vi.fn()}
        onGranularityChange={vi.fn()}
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /Reset filters/i })).toBeNull();

    view.unmount();
    view = renderWithProviders(
      <DateRangePicker
        preset="this_week"
        granularity="day"
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={vi.fn()}
        onGranularityChange={vi.fn()}
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect((await screen.findByRole('button', { name: /Reset filters/i })).className)
      .toContain('min-h-11');

    view.unmount();
    renderWithProviders(
      <DateRangePicker
        preset="this_month"
        granularity="week"
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={vi.fn()}
        onGranularityChange={vi.fn()}
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect((await screen.findByRole('button', { name: /Reset filters/i })).className)
      .toContain('min-h-11');
  });

  it('shows both date inputs for a custom range', async () => {
    renderWithProviders(
      <DateRangePicker
        preset="custom"
        granularity="day"
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={vi.fn()}
        onGranularityChange={vi.fn()}
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(await screen.findByLabelText(/Start date/i)).toBeTruthy();
    expect(screen.getByLabelText(/End date/i)).toBeTruthy();
  });

  it('shows reset for changed filters and resets them to the default state', async () => {
    renderWithProviders(<StatefulDateRangePicker />);

    const resetButton = await screen.findByRole('button', { name: /Reset filters/i });
    expect(resetButton.getAttribute('disabled')).toBeNull();

    fireEvent.click(resetButton);

    expect((screen.getByRole('combobox', { name: /Time Period/i }) as HTMLSelectElement).value)
      .toBe('this_month');
    const granularityGroup = screen.getByRole('group', { name: /Group By/i });
    expect(within(granularityGroup).getByRole('button', { name: /^Day$/i }).getAttribute('aria-pressed'))
      .toBe('true');
    expect(screen.queryByRole('button', { name: /Reset filters/i })).toBeNull();
  });

  it('disables period controls while the page is loading', async () => {
    renderWithProviders(
      <DateRangePicker
        preset="this_month"
        granularity="day"
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={vi.fn()}
        onGranularityChange={vi.fn()}
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
        disabled
      />,
    );

    expect((await screen.findByRole('combobox', { name: /Time Period/i })).getAttribute('disabled'))
      .not.toBeNull();
    expect(screen.getByRole('button', { name: /^Day$/i }).getAttribute('disabled')).not.toBeNull();
  });
});

describe('Reports UI - page hierarchy and states', () => {
  function mockReportData(hasData = true) {
    vi.spyOn(appRepositories.report, 'getCashflowSummary')
      .mockResolvedValue({
        grossIncome: hasData ? 10_000_000 : 0,
        grossExpense: hasData ? 6_000_000 : 0,
        totalOffset: 0,
        netExpense: hasData ? 6_000_000 : 0,
        totalIncome: hasData ? 10_000_000 : 0,
        totalExpense: hasData ? 6_000_000 : 0,
        netAmount: hasData ? 4_000_000 : 0,
      });
    vi.spyOn(appRepositories.report, 'getCategorySummary')
      .mockImplementation(async (_range, type) => (
        !hasData
          ? []
          : type === 'expense'
            ? [{ category_id: 'food', category_name: 'Food', amount: 6_000_000, type: 'expense' }]
            : [{ category_id: 'salary', category_name: 'Salary', amount: 10_000_000, type: 'income' }]
      ));
    vi.spyOn(appRepositories.report, 'getPeriodSummary')
      .mockResolvedValue(hasData
        ? [{ period: '2026-07-01', income: 10_000_000, expense: 6_000_000 }]
        : []);
    vi.spyOn(appRepositories.report, 'getWalletSummary')
      .mockResolvedValue(hasData
        ? [{ wallet_id: 'cash', wallet_name: 'Cash', amount: 6_000_000 }]
        : []);
  }

  function mockNetComparison(currentNet: number, previousNet: number) {
    const buildSummary = (netAmount: number) => ({
      grossIncome: 10_000_000,
      grossExpense: 6_000_000,
      totalOffset: 0,
      netExpense: 6_000_000,
      totalIncome: 10_000_000,
      totalExpense: 6_000_000,
      netAmount,
    });

    vi.spyOn(appRepositories.report, 'getCashflowSummary')
      .mockReset()
      .mockResolvedValueOnce(buildSummary(currentNet))
      .mockResolvedValueOnce(buildSummary(previousNet))
      .mockResolvedValue(buildSummary(currentNet));
  }

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/reports']}>
        <LanguageProvider>
          <ReportsPage />
          <LocationProbe />
        </LanguageProvider>
      </MemoryRouter>,
    );
  }

  it('renders the stat-led financial hierarchy after loading', async () => {
    mockReportData();
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Reports' })).toBeTruthy();
    expect(await screen.findByRole('heading', { level: 2, name: 'Financial overview' })).toBeTruthy();
    expect(screen.getByText('4,000,000 ₫')).toBeTruthy();
    expect(screen.getByText('Food spending is the strongest signal in this period.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Income and expense breakdown' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Notable insights' })).toBeTruthy();
    expect(screen.getByTestId('report-trend-periods').textContent).toBe('2026-07-01');
  });

  it('preserves header and report-tab navigation routes', async () => {
    mockReportData();
    renderPage();

    await screen.findByRole('heading', { level: 1, name: 'Reports' });
    fireEvent.click(screen.getByRole('tab', { name: 'Cashflow' }));
    expect(screen.getByTestId('location').textContent).toBe('/reports');

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(screen.getByTestId('location').textContent).toBe('/export');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('location').textContent).toBe('/');

    fireEvent.click(screen.getByRole('tab', { name: 'Budgets' }));
    expect(screen.getByTestId('location').textContent).toBe('/budget-report');
  });

  it.each([
    { current: 6_000_000, previous: 4_000_000, amount: '6,000,000 ₫', change: '+50%' },
    { current: -2_000_000, previous: 4_000_000, amount: '-2,000,000 ₫', change: '-150%' },
    { current: 4_000_000, previous: 0, amount: '4,000,000 ₫', change: '+100%' },
    { current: 0, previous: 4_000_000, amount: '0 ₫', change: '-100%' },
  ])(
    'keeps the existing net comparison for current $current and previous $previous',
    async ({ current, previous, amount, change }) => {
      mockReportData();
      mockNetComparison(current, previous);
      renderPage();

      expect((await screen.findAllByText(amount)).length).toBeGreaterThan(0);
      expect(screen.getByText(change)).toBeTruthy();
    },
  );

  it('renders a page-level loading structure without data interactions', async () => {
    const pending = new Promise<never>(() => undefined);
    vi.spyOn(appRepositories.report, 'getCashflowSummary').mockReturnValue(pending);
    vi.spyOn(appRepositories.report, 'getCategorySummary').mockReturnValue(pending);
    vi.spyOn(appRepositories.report, 'getPeriodSummary').mockReturnValue(pending);
    vi.spyOn(appRepositories.report, 'getWalletSummary').mockReturnValue(pending);

    renderPage();

    expect(await screen.findByRole('status', { name: 'Loading report' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Time Period' }).getAttribute('disabled')).not.toBeNull();
    expect(screen.queryByTestId('report-trend-periods')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Food,/ })).toBeNull();
  });

  it('renders one page-level error and blocks successful data sections', async () => {
    vi.spyOn(appRepositories.report, 'getCashflowSummary').mockRejectedValue(new Error('Database unavailable'));
    vi.spyOn(appRepositories.report, 'getCategorySummary').mockResolvedValue([]);
    vi.spyOn(appRepositories.report, 'getPeriodSummary').mockResolvedValue([]);
    vi.spyOn(appRepositories.report, 'getWalletSummary').mockResolvedValue([]);

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Database unavailable');
    expect(screen.queryByRole('heading', { level: 2, name: 'Financial overview' })).toBeNull();
    expect(screen.queryByTestId('reports-page-pie')).toBeNull();
  });

  it('distinguishes preset and custom empty states and keeps the add route', async () => {
    mockReportData(false);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Not enough data to create a report' })).toBeTruthy();

    fireEvent.change(screen.getByRole('combobox', { name: 'Time Period' }), {
      target: { value: 'custom' },
    });

    expect(await screen.findByRole('heading', { name: 'No data in this time range' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add Transaction' }));
    expect(screen.getByTestId('location').textContent).toBe('/transactions/new');
  });

  it('masks page amounts without leaking real values through text or labels', async () => {
    localStorage.setItem('dashboard_show_amounts', 'false');
    mockReportData();
    renderPage();

    await screen.findByRole('heading', { level: 2, name: 'Financial overview' });

    expect(screen.getAllByText('••••••').length).toBeGreaterThan(2);
    expect(document.body.textContent).not.toContain('4,000,000');
    expect(document.body.textContent).not.toContain('6,000,000');
    expect(document.body.textContent).not.toContain('10,000,000');
    expect(document.querySelector('[aria-label*="4,000,000"]')).toBeNull();
    expect(document.querySelector('[title*="4,000,000"]')).toBeNull();
  });
});

describe('Reports UI - expense donut filter boundary', () => {
  it('enables exclusion only for expenses without reloading or changing report totals and trends', async () => {
    const getCashflowSummary = vi.spyOn(appRepositories.report, 'getCashflowSummary')
      .mockResolvedValue({
        grossIncome: 10_000_000,
        grossExpense: 6_000_000,
        totalOffset: 0,
        netExpense: 6_000_000,
        totalIncome: 10_000_000,
        totalExpense: 6_000_000,
        netAmount: 4_000_000,
      });
    const getCategorySummary = vi.spyOn(appRepositories.report, 'getCategorySummary')
      .mockImplementation(async (_range, type) => (
        type === 'expense'
          ? [
              { category_id: 'food', category_name: 'Food', amount: 3_000_000, type: 'expense' },
              { category_id: 'shopping', category_name: 'Shopping', amount: 2_000_000, type: 'expense' },
              { category_id: 'transport', category_name: 'Transport', amount: 1_000_000, type: 'expense' },
            ]
          : [
              { category_id: 'salary', category_name: 'Salary', amount: 10_000_000, type: 'income' },
            ]
      ));
    const getPeriodSummary = vi.spyOn(appRepositories.report, 'getPeriodSummary')
      .mockResolvedValue([
        { period: '2026-07-01', income: 10_000_000, expense: 6_000_000 },
      ]);
    const getWalletSummary = vi.spyOn(appRepositories.report, 'getWalletSummary')
      .mockResolvedValue([]);

    render(
      <MemoryRouter>
        <LanguageProvider>
          <ReportsPage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    const shoppingRow = await screen.findByRole('button', { name: /^Shopping,/ });
    const salaryRow = screen.getByRole('button', { name: /^Salary,/ });
    await waitFor(() => expect(screen.getByTestId('report-summary-expense').textContent).toBe('6000000'));
    const mainInsightBeforeFilter = screen.getByText('Food spending is the strongest signal in this period.').textContent;
    const categoryInsightBeforeFilter = screen.getByText('Largest category').parentElement?.textContent;

    const readCallsBeforeFilter = {
      cashflow: getCashflowSummary.mock.calls.length,
      categories: getCategorySummary.mock.calls.length,
      periods: getPeriodSummary.mock.calls.length,
      wallets: getWalletSummary.mock.calls.length,
    };

    fireEvent.click(shoppingRow);
    fireEvent.click(screen.getByRole('button', { name: 'Exclude from chart: Shopping' }));

    expect(screen.getAllByText('Displayed expense total')).toHaveLength(2);
    expect(screen.getByTestId('report-summary-expense').textContent).toBe('6000000');
    expect(screen.getByTestId('report-summary-net').textContent).toBe('4000000');
    expect(screen.getByTestId('report-trend-periods').textContent).toBe('2026-07-01');
    expect(screen.getByText('Food spending is the strongest signal in this period.').textContent)
      .toBe(mainInsightBeforeFilter);
    expect(screen.getByText('Largest category').parentElement?.textContent)
      .toBe(categoryInsightBeforeFilter);
    expect(getCashflowSummary).toHaveBeenCalledTimes(readCallsBeforeFilter.cashflow);
    expect(getCategorySummary).toHaveBeenCalledTimes(readCallsBeforeFilter.categories);
    expect(getPeriodSummary).toHaveBeenCalledTimes(readCallsBeforeFilter.periods);
    expect(getWalletSummary).toHaveBeenCalledTimes(readCallsBeforeFilter.wallets);

    fireEvent.click(salaryRow);
    expect(screen.queryByRole('button', { name: 'Exclude from chart: Salary' })).toBeNull();
  });
});
