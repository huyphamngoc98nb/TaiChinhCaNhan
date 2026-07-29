import React, { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import {
  DonutItem,
  formatPercentLabel,
  normalizeDonutData,
  RawDonutItem,
} from './normalize-donut-data';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';

interface ReportDonutCardProps {
  title: string;
  totalLabel: string;
  emptyMessage: string;
  items: RawDonutItem[];
  palette: string[];
  loading?: boolean;
  error?: string | null;
  ariaLabel: string;
  allowExclusion?: boolean;
}

interface DonutCenterLabelProps {
  label: string;
  amount: string;
  percent?: string;
}

interface DonutLegendItem extends DonutItem {
  excluded: boolean;
}

interface DonutLegendProps {
  items: DonutLegendItem[];
  selectedId: string | null;
  formatAmount: (amount: number) => string;
  excludedLabel: string;
  onSelect: (item: DonutLegendItem) => void;
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
  excludedLabel,
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
          aria-label={`${item.label}, ${formatAmount(item.amount)}, ${
            item.excluded ? excludedLabel : item.percentLabel
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(item);
          }}
          className={`flex min-h-[44px] w-full items-center gap-3 rounded-[12px] px-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 ${
            selected ? 'bg-gray-100 ring-1 ring-gray-300' : 'active:bg-gray-50'
          } ${item.excluded ? 'opacity-50' : ''}`}
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${selected ? 'ring-2 ring-gray-400 ring-offset-2' : ''}`}
            style={{ backgroundColor: item.color }}
          />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-800">{item.label}</span>
          <span className="shrink-0 text-right text-[12px] font-bold text-gray-900 tabular-nums">
            {formatAmount(item.amount)}
            <span className="ml-1 font-semibold text-gray-500">
              {item.excluded ? `— ${excludedLabel}` : `(${item.percentLabel})`}
            </span>
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
  allowExclusion = false,
}) => {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());
  const [showAllLegend, setShowAllLegend] = useState(false);

  const allChartData = useMemo(
    () => normalizeDonutData(items, { colors: palette, otherLabel: t('reports.other') }),
    [items, palette, t],
  );
  const includedItems = useMemo(
    () => allChartData.filter(item => !allowExclusion || !excludedIds.has(item.id)),
    [allChartData, allowExclusion, excludedIds],
  );
  const visibleTotal = useMemo(
    () => includedItems.reduce((sum, item) => sum + item.amount, 0),
    [includedItems],
  );
  const visibleChartData = useMemo(() => {
    if (visibleTotal <= 0) return [];

    return includedItems.map(item => {
      const percent = (item.amount / visibleTotal) * 100;
      return {
        ...item,
        percent,
        percentLabel: formatPercentLabel(percent),
      };
    });
  }, [includedItems, visibleTotal]);
  const visibleItemsById = useMemo(
    () => new Map(visibleChartData.map(item => [item.id, item])),
    [visibleChartData],
  );
  const legendData = useMemo<DonutLegendItem[]>(
    () => allChartData.map(item => {
      const visibleItem = visibleItemsById.get(item.id);
      const excluded = allowExclusion && excludedIds.has(item.id);

      return {
        ...(visibleItem ?? item),
        percent: visibleItem?.percent ?? 0,
        percentLabel: visibleItem?.percentLabel ?? '',
        excluded,
      };
    }),
    [allChartData, allowExclusion, excludedIds, visibleItemsById],
  );
  const selectedItem = useMemo(
    () => allChartData.find(item => item.id === selectedId) ?? null,
    [allChartData, selectedId],
  );
  const hasSourceData = allChartData.length > 0;
  const hasVisibleData = visibleChartData.length > 0;
  const hasExclusions = allowExclusion && excludedIds.size > 0;

  useEffect(() => {
    const availableIds = new Set(items.map(item => item.id));

    setExcludedIds(current => {
      const next = new Set([...current].filter(id => availableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  useEffect(() => {
    if (selectedId && !items.some(item => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  const formatMoney = (value: number) => showAmounts ? formatAmount(value, locale) : HIDDEN_AMOUNT;
  const totalAmount = formatMoney(visibleTotal);
  const legendInitialCount = 5;
  const legendItems = showAllLegend ? legendData : legendData.slice(0, legendInitialCount);
  const hasMoreLegend = legendData.length > legendInitialCount;
  const hiddenLegendCount = Math.max(0, legendData.length - legendInitialCount);
  const legendToggleLabel = showAllLegend
    ? (language === 'vi' ? 'Thu gọn' : 'Show less')
    : (language === 'vi' ? `Xem thêm ${hiddenLegendCount} mục` : `Show ${hiddenLegendCount} more`);
  const displayedTotalLabel = hasExclusions
    ? t('reports.displayed_total_expense')
    : totalLabel;

  const toggleExcluded = (itemId: string) => {
    setExcludedIds(current => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  };

  const restoreAll = () => {
    setExcludedIds(new Set());
    setSelectedId(null);
  };

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

  if (!hasSourceData) {
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
      {hasVisibleData ? (
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
                  data={visibleChartData}
                  dataKey="amount"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={82}
                  paddingAngle={visibleChartData.length > 1 ? 2 : 0}
                  minAngle={8}
                  label={false}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  {visibleChartData.map(item => (
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
      ) : (
        <div
          className="mx-auto mt-3 flex min-h-[260px] w-full max-w-[360px] flex-col items-center justify-center rounded-[14px] bg-gray-50 px-5 text-center"
          onClick={event => event.stopPropagation()}
        >
          <p className="text-sm font-semibold text-gray-600">
            {t('reports.all_categories_excluded')}
          </p>
          <button
            type="button"
            onClick={restoreAll}
            className="mt-4 rounded-[10px] border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {t('reports.restore_all_categories')}
          </button>
        </div>
      )}

      <div className="mx-auto mt-2 max-w-[320px] rounded-[14px] bg-gray-50 px-3 py-2 text-center">
        <div className="text-[12px] font-semibold text-gray-500">{displayedTotalLabel}</div>
        <div className="mt-1 break-words text-[16px] font-bold leading-tight text-gray-900 tabular-nums">
          {totalAmount}
        </div>
        {hasExclusions && (
          <div className="mt-1 text-[11px] font-medium text-gray-400">
            {t('reports.chart_filter_scope_hint')}
          </div>
        )}
      </div>

      {allowExclusion && selectedItem && (
        <div
          className="mt-3 rounded-[12px] border border-gray-200 bg-gray-50 p-3"
          onClick={event => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-gray-900">
                {selectedItem.label}
              </div>
              <div className="text-[12px] text-gray-500">
                {formatMoney(selectedItem.amount)}
              </div>
            </div>
            <button
              type="button"
              aria-label={`${
                excludedIds.has(selectedItem.id)
                  ? t('reports.include_in_chart')
                  : t('reports.exclude_from_chart')
              }: ${selectedItem.label}`}
              onClick={() => {
                toggleExcluded(selectedItem.id);
                setSelectedId(null);
              }}
              className="shrink-0 rounded-[10px] border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              {excludedIds.has(selectedItem.id)
                ? t('reports.include_in_chart')
                : t('reports.exclude_from_chart')}
            </button>
          </div>
        </div>
      )}
      {hasExclusions && hasVisibleData && (
        <div className="mt-2 flex justify-end" onClick={event => event.stopPropagation()}>
          <button
            type="button"
            onClick={restoreAll}
            className="rounded-[10px] px-2 py-2 text-[12px] font-semibold text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {t('reports.restore_all_categories')}
          </button>
        </div>
      )}

      <DonutLegend
        items={legendItems}
        selectedId={selectedId}
        formatAmount={formatMoney}
        excludedLabel={t('reports.excluded_from_chart')}
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
