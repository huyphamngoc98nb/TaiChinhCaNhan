import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCashflowTrendData,
  CashflowTrendChart,
  getCashflowXAxisTicks,
} from '@/modules/reports/components/CashflowTrendChart';
import { CurrencyProvider } from '@/shared/context/CurrencyContext';
import { LanguageProvider } from '@/shared/context/LanguageContext';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: 'en' })),
    set: vi.fn(async () => undefined),
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({
    children,
    data,
    accessibilityLayer,
  }: {
    children: React.ReactNode;
    data: Array<{ net: number }>;
    accessibilityLayer: boolean;
  }) => (
    <div
      data-testid="area-chart"
      data-net-values={data.map((item) => item.net).join(',')}
      data-accessibility-layer={String(accessibilityLayer)}
    >
      {children}
    </div>
  ),
  Area: ({ dataKey }: { dataKey: string }) => <div data-testid="area" data-key={dataKey} />,
  CartesianGrid: () => null,
  ReferenceLine: () => <div data-testid="zero-line" />,
  Tooltip: () => null,
  XAxis: () => null,
}));

const data = [
  { period: '2026-06-01', income: 100, expense: 40 },
  { period: '2026-06-02', income: 20, expense: 50 },
];

function renderChart(chartData = data) {
  return render(
    <LanguageProvider>
      <CurrencyProvider>
        <CashflowTrendChart data={chartData} />
      </CurrencyProvider>
    </LanguageProvider>
  );
}

describe('CashflowTrendChart', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('derives net cashflow without changing PeriodSummary input', () => {
    expect(buildCashflowTrendData(data)).toEqual([
      { ...data[0], net: 60 },
      { ...data[1], net: -30 },
    ]);
    expect(data[0]).not.toHaveProperty('net');
  });

  it('limits the X axis to readable, evenly distributed labels', () => {
    const longRange = Array.from({ length: 31 }, (_, index) => ({
      period: `2026-06-${String(index + 1).padStart(2, '0')}`,
      income: 0,
      expense: 0,
    }));

    const ticks = getCashflowXAxisTicks(longRange);

    expect(ticks).toHaveLength(4);
    expect(ticks[0]).toBe('2026-06-01');
    expect(ticks[3]).toBe('2026-06-31');
  });

  it('switches between income, expense, and net trends', async () => {
    renderChart();

    expect((await screen.findByRole('tab', { name: 'Income' })).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('area').getAttribute('data-key')).toBe('income');

    fireEvent.click(screen.getByRole('tab', { name: 'Expense' }));

    expect(screen.getByRole('tab', { name: 'Expense' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('area').getAttribute('data-key')).toBe('expense');

    fireEvent.click(screen.getByRole('tab', { name: 'Net cashflow' }));

    expect(screen.getByRole('tab', { name: 'Net cashflow' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('area').getAttribute('data-key')).toBe('net');
    expect(screen.getByTestId('area-chart').getAttribute('data-net-values')).toBe('60,-30');
    expect(screen.getByTestId('zero-line')).toBeTruthy();
  });

  it('provides a translated non-pointer summary for the active metric', async () => {
    renderChart();

    const summary = await screen.findByRole('status');
    expect(summary.textContent).toContain('Income. 2 data points in this period.');
    expect(summary.textContent).toContain('100');
    expect(summary.textContent).toContain('20');
    expect(screen.getByTestId('area-chart').getAttribute('data-accessibility-layer')).toBe('true');
  });

  it('masks accessible values and disables the raw chart accessibility layer when amounts are hidden', async () => {
    localStorage.setItem('dashboard_show_amounts', 'false');
    renderChart();

    const summary = await screen.findByRole('status');
    expect(summary.textContent).toContain('••••••');
    expect(summary.textContent).not.toContain('100 ₫');
    expect(summary.textContent).not.toContain('20 ₫');
    expect(screen.getByTestId('area-chart').getAttribute('data-accessibility-layer')).toBe('false');
  });

  it('shows the existing empty state when there is no period data', async () => {
    renderChart([]);

    expect(await screen.findByRole('heading', { level: 2, name: 'Cashflow Over Time' })).toBeTruthy();
    expect(await screen.findByText('No cashflow data in this period.')).toBeTruthy();
    expect(screen.queryByTestId('area-chart')).toBeNull();
  });
});
