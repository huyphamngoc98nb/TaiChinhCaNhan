import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportDonutCard } from './ReportDonutCard';

const amountVisibility = vi.hoisted(() => ({ showAmounts: true }));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pie: ({
    children,
    data,
    innerRadius,
  }: {
    children: ReactNode;
    data: Array<{ id: string }>;
    innerRadius: number;
  }) => (
    <div
      data-testid="pie"
      data-ids={data.map(item => item.id).join(',')}
      data-inner-radius={innerRadius}
    >
      {children}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => (
    <span data-testid="pie-slice" data-fill={fill} />
  ),
}));

const translations: Record<string, string> = {
  'common.loading': 'Loading...',
  'reports.other': 'Other',
  'reports.exclude_from_chart': 'Exclude from chart',
  'reports.include_in_chart': 'Add back to chart',
  'reports.excluded_from_chart': 'Excluded',
  'reports.included_in_chart': 'Included in chart',
  'reports.restore_all_categories': 'Restore all',
  'reports.all_categories_excluded': 'All categories have been excluded from the chart',
  'reports.all_categories_excluded_hint': 'Categories are only hidden from this chart. Transaction data is unchanged.',
  'reports.displayed_total_expense': 'Displayed expense total',
  'reports.chart_filter_scope_hint': 'Only applies to this chart',
  'reports.categories_visible_count': '{count} categories displayed',
  'reports.categories_excluded_count': '{count} excluded',
  'reports.chart_accessible_summary': '{visibleCount} categories displayed. {totalLabel}: {total}.',
  'reports.show_more_categories': 'Show {count} more',
  'reports.show_less_categories': 'Show less',
};

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => translations[key] ?? key,
  }),
}));

vi.mock('@/shared/context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatAmount: (value: number) => `${new Intl.NumberFormat('en-US').format(value)} ₫`,
  }),
}));

vi.mock('@/shared/hooks/useAmountVisibility', () => ({
  HIDDEN_AMOUNT: '••••••',
  useAmountVisibility: () => ({ showAmounts: amountVisibility.showAmounts }),
}));

const expenseItems = [
  { id: 'food', label: 'Food', amount: 3_000_000 },
  { id: 'transport', label: 'Transport', amount: 1_000_000 },
  { id: 'shopping', label: 'Shopping', amount: 2_000_000 },
];

const palette = [
  'var(--chart-expense)',
  'var(--warning)',
  'var(--chart-series-5)',
];

function renderCard(
  items = expenseItems,
  allowExclusion = true,
) {
  return render(
    <ReportDonutCard
      title="Expense by category"
      totalLabel="Total expense"
      emptyMessage="No expense data"
      items={items}
      palette={palette}
      ariaLabel="Expense category chart"
      allowExclusion={allowExclusion}
    />,
  );
}

function getLegendItem(label: string) {
  return screen.getByRole('button', { name: new RegExp(`^${label},`) });
}

function getDisplayedTotal() {
  return screen.getByTestId('displayed-total');
}

function excludeCategory(label: string) {
  fireEvent.click(getLegendItem(label));
  fireEvent.click(screen.getByRole('button', { name: `Exclude from chart: ${label}` }));
}

describe('ReportDonutCard category exclusion and redesign', () => {
  beforeEach(() => {
    localStorage.clear();
    amountVisibility.showAmounts = true;
  });

  it('renders the full total, donut center, and all source categories by default', () => {
    renderCard();

    expect(within(getDisplayedTotal()).getByText('6,000,000 ₫')).toBeTruthy();
    expect(within(screen.getByTestId('donut-center')).getByText('6,000,000 ₫')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,shopping,transport');
    expect(screen.getByTestId('pie').getAttribute('data-inner-radius')).toBe('54');
    expect(getLegendItem('Food')).toBeTruthy();
    expect(getLegendItem('Transport')).toBeTruthy();
    expect(getLegendItem('Shopping')).toBeTruthy();
    expect(screen.getByText('3 categories displayed')).toBeTruthy();
    expect(screen.queryByText('Excluded')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Restore all' })).toBeNull();
  });

  it('selects a category through the legend and exposes contextual detail and action', () => {
    renderCard();

    const shoppingRow = getLegendItem('Shopping');
    fireEvent.click(shoppingRow);

    expect(shoppingRow.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Exclude from chart: Shopping' })).toBeTruthy();
    expect(screen.getByText('Included in chart')).toBeTruthy();
    expect(within(screen.getByTestId('donut-center')).getByText('Shopping')).toBeTruthy();
    expect(within(screen.getByTestId('donut-center')).getByText('2,000,000 ₫')).toBeTruthy();
    expect(within(screen.getByTestId('donut-center')).getByText('33%')).toBeTruthy();
  });

  it('excludes a category from the donut while retaining its legend row and recalculating percentages', () => {
    renderCard();

    excludeCategory('Shopping');

    expect(within(getDisplayedTotal()).getByText('4,000,000 ₫')).toBeTruthy();
    expect(within(getDisplayedTotal()).getByText('Displayed expense total')).toBeTruthy();
    expect(screen.getByText('Only applies to this chart')).toBeTruthy();
    expect(screen.getByText('2 categories displayed · 1 excluded')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,transport');
    expect(getLegendItem('Shopping').getAttribute('data-excluded')).toBe('true');
    expect(within(getLegendItem('Shopping')).getByText('Excluded')).toBeTruthy();
    expect(within(getLegendItem('Food')).getByText('75%')).toBeTruthy();
    expect(within(getLegendItem('Transport')).getByText('25%')).toBeTruthy();
  });

  it('adds an excluded category back and restores its total and slice', () => {
    renderCard();
    excludeCategory('Shopping');

    fireEvent.click(getLegendItem('Shopping'));
    fireEvent.click(screen.getByRole('button', { name: 'Add back to chart: Shopping' }));

    expect(within(getDisplayedTotal()).getByText('6,000,000 ₫')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,shopping,transport');
    expect(getLegendItem('Shopping').getAttribute('data-excluded')).toBe('false');
    expect(screen.queryByText('Displayed expense total')).toBeNull();
  });

  it('supports excluding multiple categories and recalculates the remaining item to 100%', () => {
    renderCard();

    excludeCategory('Shopping');
    excludeCategory('Transport');

    expect(within(getDisplayedTotal()).getByText('3,000,000 ₫')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food');
    expect(within(getLegendItem('Food')).getByText('100%')).toBeTruthy();
  });

  it('shows a dedicated all-excluded state and restores every category', () => {
    renderCard();

    excludeCategory('Food');
    excludeCategory('Shopping');
    excludeCategory('Transport');

    expect(screen.getByText('All categories have been excluded from the chart')).toBeTruthy();
    expect(screen.getByText('Categories are only hidden from this chart. Transaction data is unchanged.')).toBeTruthy();
    expect(screen.queryByText('No expense data')).toBeNull();
    expect(screen.queryByTestId('pie')).toBeNull();
    expect(within(getDisplayedTotal()).getByText('0 ₫')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Restore all' }));

    expect(within(getDisplayedTotal()).getByText('6,000,000 ₫')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,shopping,transport');
    expect(screen.queryByText('All categories have been excluded from the chart')).toBeNull();
  });

  it('keeps category colors stable when another category is excluded', () => {
    renderCard();
    const foodColor = getLegendItem('Food').querySelector('[aria-hidden="true"]')?.getAttribute('style');
    const transportColor = getLegendItem('Transport').querySelector('[aria-hidden="true"]')?.getAttribute('style');

    excludeCategory('Shopping');

    expect(getLegendItem('Food').querySelector('[aria-hidden="true"]')?.getAttribute('style')).toBe(foodColor);
    expect(getLegendItem('Transport').querySelector('[aria-hidden="true"]')?.getAttribute('style')).toBe(transportColor);
  });

  it('keeps duplicate category labels distinct through their IDs', () => {
    renderCard([
      { id: 'other-1', label: 'Other', amount: 2_000_000 },
      { id: 'other-2', label: 'Other', amount: 1_000_000 },
    ]);

    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('other-1,other-2');
    expect(screen.getAllByRole('button', { name: /^Other,/ })).toHaveLength(2);
  });

  it('keeps legend selection but hides exclusion and restore actions when the feature is disabled', () => {
    renderCard(expenseItems, false);

    fireEvent.click(getLegendItem('Shopping'));

    expect(getLegendItem('Shopping').getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: /Exclude from chart/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Restore all/ })).toBeNull();
    expect(screen.queryByText('3 categories displayed')).toBeNull();
    expect(within(getDisplayedTotal()).getByText('6,000,000 ₫')).toBeTruthy();
  });

  it('does not mutate the source items while toggling exclusions', () => {
    const sourceItems = expenseItems.map(item => ({ ...item }));
    const snapshot = structuredClone(sourceItems);
    renderCard(sourceItems);

    excludeCategory('Shopping');
    fireEvent.click(getLegendItem('Shopping'));
    fireEvent.click(screen.getByRole('button', { name: 'Add back to chart: Shopping' }));

    expect(sourceItems).toEqual(snapshot);
  });

  it('masks every amount without leaking values into accessible labels', () => {
    amountVisibility.showAmounts = false;
    renderCard();

    fireEvent.click(getLegendItem('Food'));

    expect(within(screen.getByTestId('donut-center')).getByText('••••••')).toBeTruthy();
    expect(within(getDisplayedTotal()).getByText('••••••')).toBeTruthy();
    expect(screen.getAllByText('••••••').length).toBeGreaterThanOrEqual(5);
    expect(document.body.textContent).not.toContain('3,000,000');
    expect(document.body.textContent).not.toContain('6,000,000');
    expect(document.querySelector('[aria-label*="3,000,000"]')).toBeNull();
    expect(document.querySelector('[aria-label*="6,000,000"]')).toBeNull();
  });

  it('prunes stale exclusions and resets a stale selection when source items change', () => {
    const { rerender } = renderCard();
    fireEvent.click(getLegendItem('Shopping'));

    rerender(
      <ReportDonutCard
        title="Expense by category"
        totalLabel="Total expense"
        emptyMessage="No expense data"
        items={expenseItems.filter(item => item.id !== 'shopping')}
        palette={palette}
        ariaLabel="Expense category chart"
        allowExclusion
      />,
    );

    expect(screen.queryByRole('button', { name: 'Exclude from chart: Shopping' })).toBeNull();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,transport');

    rerender(
      <ReportDonutCard
        title="Expense by category"
        totalLabel="Total expense"
        emptyMessage="No expense data"
        items={expenseItems}
        palette={palette}
        ariaLabel="Expense category chart"
        allowExclusion
      />,
    );

    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,shopping,transport');
    expect(getLegendItem('Shopping').getAttribute('data-excluded')).toBe('false');
  });

  it('keeps excluded items accessible when the long legend collapses', () => {
    const longItems = Array.from({ length: 7 }, (_, index) => ({
      id: `category-${index + 1}`,
      label: `Category ${index + 1}`,
      amount: 700 - index * 50,
    }));
    renderCard(longItems);

    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more' }));
    excludeCategory('Category 7');
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));

    expect(getLegendItem('Category 7')).toBeTruthy();
    expect(getLegendItem('Category 7').getAttribute('data-excluded')).toBe('true');
  });

  it('keeps loading, error, and empty states structurally distinct', () => {
    const { rerender } = render(
      <ReportDonutCard
        title="Expense by category"
        totalLabel="Total expense"
        emptyMessage="No expense data"
        items={expenseItems}
        palette={palette}
        ariaLabel="Expense category chart"
        loading
      />,
    );

    expect(screen.getByLabelText('Expense by category: Loading...').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByTestId('pie')).toBeNull();

    rerender(
      <ReportDonutCard
        title="Expense by category"
        totalLabel="Total expense"
        emptyMessage="No expense data"
        items={expenseItems}
        palette={palette}
        ariaLabel="Expense category chart"
        error="Could not load categories"
      />,
    );
    expect(screen.getByRole('alert').textContent).toBe('Could not load categories');
    expect(screen.queryByTestId('pie')).toBeNull();

    rerender(
      <ReportDonutCard
        title="Expense by category"
        totalLabel="Total expense"
        emptyMessage="No expense data"
        items={[]}
        palette={palette}
        ariaLabel="Expense category chart"
      />,
    );
    expect(screen.getByText('No expense data')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('provides chart description, button semantics, focus styles, and separate selected/excluded states', () => {
    renderCard();

    const chart = screen.getByRole('img', { name: 'Expense category chart' });
    const descriptionId = chart.getAttribute('aria-describedby');
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain('3 categories displayed');

    const shoppingRow = getLegendItem('Shopping');
    expect(shoppingRow.getAttribute('type')).toBe('button');
    expect(shoppingRow.className).toContain('focus-visible:ring-2');
    fireEvent.click(shoppingRow);
    expect(shoppingRow.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Exclude from chart: Shopping' }));
    expect(getLegendItem('Shopping').getAttribute('aria-pressed')).toBe('false');
    expect(getLegendItem('Shopping').getAttribute('data-excluded')).toBe('true');
    expect(getLegendItem('Shopping').getAttribute('aria-label')).toContain('Excluded');
  });
});
