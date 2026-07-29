import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportDonutCard } from './ReportDonutCard';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Pie: ({
    children,
    data,
  }: {
    children: ReactNode;
    data: Array<{ id: string }>;
  }) => (
    <div data-testid="pie" data-ids={data.map(item => item.id).join(',')}>
      {children}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => (
    <span data-testid="pie-slice" style={{ backgroundColor: fill }} />
  ),
}));

const translations: Record<string, string> = {
  'reports.other': 'Khác',
  'reports.exclude_from_chart': 'Loại khỏi biểu đồ',
  'reports.include_in_chart': 'Thêm lại vào biểu đồ',
  'reports.excluded_from_chart': 'Đã loại trừ',
  'reports.restore_all_categories': 'Khôi phục tất cả',
  'reports.all_categories_excluded': 'Tất cả danh mục đã bị loại khỏi biểu đồ',
  'reports.displayed_total_expense': 'Tổng chi đang hiển thị',
  'reports.chart_filter_scope_hint': 'Chỉ áp dụng cho biểu đồ này',
};

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'vi',
    t: (key: string) => translations[key] ?? key,
  }),
}));

vi.mock('@/shared/context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatAmount: (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`,
  }),
}));

vi.mock('@/shared/hooks/useAmountVisibility', () => ({
  HIDDEN_AMOUNT: '••••••',
  useAmountVisibility: () => ({ showAmounts: true }),
}));

const expenseItems = [
  { id: 'food', label: 'Ăn uống', amount: 3_000_000 },
  { id: 'transport', label: 'Di chuyển', amount: 1_000_000 },
  { id: 'shopping', label: 'Mua sắm', amount: 2_000_000 },
];

const palette = ['#ef4444', '#f97316', '#eab308'];

function renderCard(
  items = expenseItems,
  allowExclusion = true,
) {
  return render(
    <ReportDonutCard
      title="Chi tiêu theo danh mục"
      totalLabel="Tổng chi"
      emptyMessage="Không có dữ liệu"
      items={items}
      palette={palette}
      ariaLabel="Biểu đồ chi tiêu"
      allowExclusion={allowExclusion}
    />,
  );
}

function getLegendItem(label: string) {
  return screen.getByRole('button', { name: new RegExp(label) });
}

function excludeCategory(label: string) {
  fireEvent.click(getLegendItem(label));
  fireEvent.click(screen.getByRole('button', { name: `Loại khỏi biểu đồ: ${label}` }));
}

describe('ReportDonutCard category exclusion', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the initial total and all source categories', () => {
    renderCard();

    expect(screen.getByText('6.000.000 ₫')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,shopping,transport');
    expect(getLegendItem('Ăn uống')).toBeTruthy();
    expect(getLegendItem('Di chuyển')).toBeTruthy();
    expect(getLegendItem('Mua sắm')).toBeTruthy();
  });

  it('excludes a category from the pie while keeping it in the legend and recalculating percentages', () => {
    renderCard();

    excludeCategory('Mua sắm');

    expect(screen.getByText('4.000.000 ₫')).toBeTruthy();
    expect(screen.getByText('Tổng chi đang hiển thị')).toBeTruthy();
    expect(screen.getByText('Chỉ áp dụng cho biểu đồ này')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,transport');
    expect(within(getLegendItem('Mua sắm')).getByText('— Đã loại trừ')).toBeTruthy();
    expect(within(getLegendItem('Ăn uống')).getByText('(75%)')).toBeTruthy();
    expect(within(getLegendItem('Di chuyển')).getByText('(25%)')).toBeTruthy();
  });

  it('adds an excluded category back and restores its total and slice', () => {
    renderCard();
    excludeCategory('Mua sắm');

    fireEvent.click(getLegendItem('Mua sắm'));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lại vào biểu đồ: Mua sắm' }));

    expect(screen.getByText('6.000.000 ₫')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,shopping,transport');
    expect(within(getLegendItem('Mua sắm')).queryByText('— Đã loại trừ')).toBeNull();
    expect(screen.queryByText('Tổng chi đang hiển thị')).toBeNull();
  });

  it('supports excluding multiple categories', () => {
    renderCard();

    excludeCategory('Mua sắm');
    excludeCategory('Di chuyển');

    const displayedTotal = screen.getByText('Tổng chi đang hiển thị').parentElement;
    expect(displayedTotal && within(displayedTotal).getByText('3.000.000 ₫')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food');
  });

  it('shows a dedicated all-excluded state and restores every category', () => {
    renderCard();

    excludeCategory('Ăn uống');
    excludeCategory('Mua sắm');
    excludeCategory('Di chuyển');

    expect(screen.getByText('Tất cả danh mục đã bị loại khỏi biểu đồ')).toBeTruthy();
    expect(screen.queryByText('Không có dữ liệu')).toBeNull();
    expect(screen.queryByTestId('pie')).toBeNull();
    expect(screen.getByText('0 ₫')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Khôi phục tất cả' }));

    expect(screen.getByText('6.000.000 ₫')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,shopping,transport');
    expect(screen.queryByText('Đã loại trừ')).toBeNull();
  });

  it('keeps category colors stable when another category is excluded', () => {
    renderCard();
    const foodColor = getLegendItem('Ăn uống').querySelector('span')?.style.backgroundColor;
    const transportColor = getLegendItem('Di chuyển').querySelector('span')?.style.backgroundColor;

    excludeCategory('Mua sắm');

    expect(getLegendItem('Ăn uống').querySelector('span')?.style.backgroundColor).toBe(foodColor);
    expect(getLegendItem('Di chuyển').querySelector('span')?.style.backgroundColor).toBe(transportColor);
  });

  it('does not expose exclusion actions when the feature is disabled', () => {
    renderCard(expenseItems, false);

    fireEvent.click(getLegendItem('Mua sắm'));

    expect(screen.queryByRole('button', { name: /Loại khỏi biểu đồ/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Khôi phục tất cả/ })).toBeNull();
    expect(screen.getByText('6.000.000 ₫')).toBeTruthy();
    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,shopping,transport');
  });

  it('prunes stale excluded IDs when source categories change', () => {
    const { rerender } = renderCard();
    excludeCategory('Mua sắm');

    rerender(
      <ReportDonutCard
        title="Chi tiêu theo danh mục"
        totalLabel="Tổng chi"
        emptyMessage="Không có dữ liệu"
        items={expenseItems.filter(item => item.id !== 'shopping')}
        palette={palette}
        ariaLabel="Biểu đồ chi tiêu"
        allowExclusion
      />,
    );
    rerender(
      <ReportDonutCard
        title="Chi tiêu theo danh mục"
        totalLabel="Tổng chi"
        emptyMessage="Không có dữ liệu"
        items={expenseItems}
        palette={palette}
        ariaLabel="Biểu đồ chi tiêu"
        allowExclusion
      />,
    );

    expect(screen.getByTestId('pie').getAttribute('data-ids')).toBe('food,shopping,transport');
    expect(within(getLegendItem('Mua sắm')).queryByText('— Đã loại trừ')).toBeNull();
  });

  it('does not mutate the source items while toggling exclusions', () => {
    const sourceItems = expenseItems.map(item => ({ ...item }));
    const snapshot = structuredClone(sourceItems);
    renderCard(sourceItems);

    excludeCategory('Mua sắm');
    fireEvent.click(getLegendItem('Mua sắm'));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lại vào biểu đồ: Mua sắm' }));

    expect(sourceItems).toEqual(snapshot);
  });
});
