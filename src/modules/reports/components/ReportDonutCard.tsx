import React, { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { DonutItem, normalizeDonutData, RawDonutItem } from './normalize-donut-data';

interface ReportDonutCardProps {
  title: string;
  totalLabel: string;
  emptyMessage: string;
  items: RawDonutItem[];
  palette: string[];
  loading?: boolean;
  error?: string | null;
  ariaLabel: string;
}

interface DonutCenterLabelProps {
  label: string;
  amount: string;
  percent?: string;
}

interface DonutLegendProps {
  items: DonutItem[];
  selectedId: string | null;
  formatAmount: (amount: number) => string;
  onSelect: (item: DonutItem) => void;
}

export const DonutCenterLabel: React.FC<DonutCenterLabelProps> = ({ label, amount, percent }) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <div className="max-w-[132px] px-2 text-center">
      <div className="truncate text-[12px] font-semibold text-gray-500">{label}</div>
      <div className="mt-1 break-words text-[15px] font-bold leading-tight text-gray-900 tabular-nums">{amount}</div>
      {percent && <div className="mt-0.5 text-[12px] font-semibold text-gray-500">{percent}</div>}
    </div>
  </div>
);

export const DonutLegend: React.FC<DonutLegendProps> = ({
  items,
  selectedId,
  formatAmount,
  onSelect,
}) => (
  <div className="mt-4 border-t border-gray-100 pt-2">
    {items.map(item => {
      const selected = selectedId === item.id;
      return (
        <button
          key={item.id}
          type="button"
          aria-pressed={selected}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(item);
          }}
          className={`flex min-h-[44px] w-full items-center gap-3 rounded-[12px] px-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 ${
            selected ? 'bg-gray-100 ring-1 ring-gray-300' : 'active:bg-gray-50'
          }`}
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${selected ? 'ring-2 ring-gray-400 ring-offset-2' : ''}`}
            style={{ backgroundColor: item.color }}
          />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-800">{item.label}</span>
          <span className="shrink-0 text-right text-[12px] font-bold text-gray-900 tabular-nums">
            {formatAmount(item.amount)}
            <span className="ml-1 font-semibold text-gray-500">({item.percentLabel})</span>
          </span>
        </button>
      );
    })}
  </div>
);

export const ReportDonutCard: React.FC<ReportDonutCardProps> = ({
  title,
  totalLabel,
  emptyMessage,
  items,
  palette,
  loading = false,
  error = null,
  ariaLabel,
}) => {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllLegend, setShowAllLegend] = useState(false);

  const chartData = useMemo(
    () => normalizeDonutData(items, { colors: palette, otherLabel: t('reports.other') }),
    [items, palette, t],
  );
  const total = useMemo(() => chartData.reduce((sum, item) => sum + item.amount, 0), [chartData]);

  const formatMoney = (value: number) => formatAmount(value, locale);
  const totalAmount = formatMoney(total);
  const legendInitialCount = 5;
  const legendItems = showAllLegend ? chartData : chartData.slice(0, legendInitialCount);
  const hasMoreLegend = chartData.length > legendInitialCount;
  const hiddenLegendCount = Math.max(0, chartData.length - legendInitialCount);
  const legendToggleLabel = showAllLegend
    ? (language === 'vi' ? 'Thu gọn' : 'Show less')
    : (language === 'vi' ? `Xem thêm ${hiddenLegendCount} mục` : `Show ${hiddenLegendCount} more`);

  if (loading) {
    return (
      <div className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-4 h-4 w-40 rounded bg-gray-100" />
        <div className="mx-auto h-[260px] w-full max-w-[360px] rounded-[18px] bg-gray-100" />
        <div className="mt-4 space-y-2">
          <div className="h-10 rounded-[12px] bg-gray-100" />
          <div className="h-10 rounded-[12px] bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[16px] border border-red-100 bg-white p-4 shadow-sm">
        <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
        <div className="mt-4 rounded-[12px] bg-red-50 p-3 text-sm text-red-600">{error}</div>
      </div>
    );
  }

  if (total <= 0 || chartData.length === 0) {
    return (
      <div className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
        <div className="mt-4 flex min-h-[160px] items-center justify-center rounded-[14px] bg-gray-50 px-4 text-center text-sm text-gray-400">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <section
      className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-sm"
      onClick={() => setSelectedId(null)}
      aria-label={ariaLabel}
    >
      <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
      <div
        className="relative mx-auto mt-3 w-full max-w-[360px]"
        style={{ height: 260 }}
        role="img"
        aria-label={ariaLabel}
        onClick={event => event.stopPropagation()}
      >
        <div className="pointer-events-none h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={82}
                paddingAngle={chartData.length > 1 ? 2 : 0}
                minAngle={8}
                label={false}
                labelLine={false}
                isAnimationActive={false}
              >
                {chartData.map(item => (
                  <Cell
                    key={item.id}
                    fill={item.color}
                    stroke={selectedId === item.id ? 'var(--text)' : 'var(--surface)'}
                    strokeWidth={selectedId === item.id ? 3 : 1.5}
                    opacity={!selectedId || selectedId === item.id ? 1 : 0.45}
                    style={{ outline: 'none' }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-[320px] rounded-[14px] bg-gray-50 px-3 py-2 text-center">
        <div className="text-[12px] font-semibold text-gray-500">{totalLabel}</div>
        <div className="mt-1 break-words text-[16px] font-bold leading-tight text-gray-900 tabular-nums">
          {totalAmount}
        </div>
      </div>

      <DonutLegend
        items={legendItems}
        selectedId={selectedId}
        formatAmount={formatMoney}
        onSelect={item => setSelectedId(currentId => currentId === item.id ? null : item.id)}
      />
      {hasMoreLegend && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowAllLegend(value => !value);
          }}
          className="mt-1 w-full rounded-[10px] py-2 text-center text-[12px] font-semibold text-gray-500 transition-colors active:bg-gray-50 focus:outline-none"
        >
          {legendToggleLabel}
        </button>
      )}
    </section>
  );
};
