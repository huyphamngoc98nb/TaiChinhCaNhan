/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
/*
 * Hallmark · component: report donut card · genre: utilitarian · theme: locked design.md
 * states: default · active · focus · selected · excluded · loading · empty · error · all-excluded
 */
import React, { useEffect, useId, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import {
  DonutItem,
  formatPercentLabel,
  normalizeDonutData,
  RawDonutItem,
} from './normalize-donut-data';

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
  status?: string;
}

interface DonutLegendItem extends DonutItem {
  excluded: boolean;
}

interface DonutLegendProps {
  items: DonutLegendItem[];
  selectedId: string | null;
  formatAmount: (amount: number) => string;
  excludedLabel: string;
  ariaLabel: string;
  onSelect: (item: DonutLegendItem) => void;
}

interface DonutHeaderProps {
  title: string;
  summary?: string;
  restoreLabel: string;
  showRestore: boolean;
  onRestore: () => void;
}

interface DonutChartProps {
  ariaLabel: string;
  descriptionId: string;
  items: DonutItem[];
  selectedId: string | null;
  center: DonutCenterLabelProps;
}

interface SelectedCategoryActionProps {
  item: DonutLegendItem;
  amount: string;
  includedLabel: string;
  excludedLabel: string;
  excludeLabel: string;
  includeLabel: string;
  onToggle: () => void;
}

interface AllExcludedStateProps {
  title: string;
  hint: string;
  restoreLabel: string;
  onRestore: () => void;
}

const replacePlaceholders = (
  template: string,
  values: Record<string, string | number>,
) => Object.entries(values).reduce(
  (message, [key, value]) => message.split(`{${key}}`).join(String(value)),
  template,
);

const focusRingClasses =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring-offset)]';

export const DonutCenterLabel: React.FC<DonutCenterLabelProps> = ({
  label,
  amount,
  percent,
  status,
}) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <div className="min-w-0 max-w-[124px] px-2 text-center" data-testid="donut-center">
      <div className="truncate text-xs font-semibold text-muted">{label}</div>
      <div className="mt-1 break-words text-base font-bold leading-tight text-text tabular-nums">
        {amount}
      </div>
      {percent && <div className="mt-1 text-xs font-semibold text-muted">{percent}</div>}
      {status && <div className="mt-1 text-xs font-semibold text-muted">{status}</div>}
    </div>
  </div>
);

const DonutHeader: React.FC<DonutHeaderProps> = ({
  title,
  summary,
  restoreLabel,
  showRestore,
  onRestore,
}) => (
  <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-bold leading-5 text-text">{title}</h3>
      {summary && <p className="mt-1 text-xs leading-4 text-muted">{summary}</p>}
    </div>
    {showRestore && (
      <button
        type="button"
        onClick={onRestore}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] px-3 text-xs font-semibold text-text transition-colors active:bg-bg-subtle ${focusRingClasses}`}
      >
        {restoreLabel}
      </button>
    )}
  </header>
);

const DonutChart: React.FC<DonutChartProps> = ({
  ariaLabel,
  descriptionId,
  items,
  selectedId,
  center,
}) => (
  <div
    className="relative mx-auto mt-3 h-60 w-full max-w-[360px]"
    role="img"
    aria-label={ariaLabel}
    aria-describedby={descriptionId}
    onClick={event => event.stopPropagation()}
  >
    <div className="pointer-events-none h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={items}
            dataKey="amount"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={54}
            outerRadius={88}
            paddingAngle={items.length > 1 ? 2 : 0}
            minAngle={8}
            label={false}
            labelLine={false}
            isAnimationActive={false}
          >
            {items.map(item => (
              <Cell
                key={item.id}
                fill={item.color}
                stroke={selectedId === item.id ? 'var(--selected-border)' : 'var(--surface)'}
                strokeWidth={selectedId === item.id ? 4 : 2}
                opacity={!selectedId || selectedId === item.id ? 1 : 0.55}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
    <DonutCenterLabel {...center} />
  </div>
);

export const DonutLegend: React.FC<DonutLegendProps> = ({
  items,
  selectedId,
  formatAmount,
  excludedLabel,
  ariaLabel,
  onSelect,
}) => (
  <ul className="mt-3 border-t border-border pt-2" aria-label={ariaLabel}>
    {items.map(item => {
      const selected = selectedId === item.id;
      const rowStateClasses = selected
        ? 'border-[var(--selected-border)] bg-[var(--selected-bg)] active:bg-surface-muted'
        : item.excluded
          ? 'border-border bg-surface-muted active:bg-bg-subtle'
          : 'border-transparent bg-surface active:bg-bg-subtle';

      return (
        <li key={item.id}>
          <button
            type="button"
            data-category-id={item.id}
            data-excluded={item.excluded ? 'true' : 'false'}
            aria-pressed={selected}
            aria-label={`${item.label}, ${formatAmount(item.amount)}, ${
              item.excluded ? excludedLabel : item.percentLabel
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(item);
            }}
            className={`grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-2 text-left transition-colors ${rowStateClasses} ${focusRingClasses}`}
          >
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full border-2"
              style={{
                backgroundColor: item.excluded ? 'transparent' : item.color,
                borderColor: item.color,
              }}
            />
            <span className={`min-w-0 truncate text-sm font-semibold ${
              selected ? 'text-[var(--selected-text)]' : 'text-text'
            }`}>
              {item.label}
            </span>
            <span className="min-w-0 shrink-0 whitespace-nowrap text-right text-xs font-bold text-text tabular-nums">
              <span className="block">{formatAmount(item.amount)}</span>
              <span className={`block font-semibold ${
                selected
                  ? 'text-[var(--selected-text)]'
                  : item.excluded
                    ? 'text-text'
                    : 'text-muted'
              }`}>
                {item.excluded ? excludedLabel : item.percentLabel}
              </span>
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

const SelectedCategoryAction: React.FC<SelectedCategoryActionProps> = ({
  item,
  amount,
  includedLabel,
  excludedLabel,
  excludeLabel,
  includeLabel,
  onToggle,
}) => {
  const actionLabel = item.excluded ? includeLabel : excludeLabel;
  const statusLabel = item.excluded ? excludedLabel : includedLabel;

  return (
    <div
      className="mt-3 border-y border-border bg-bg-subtle px-3 py-3"
      onClick={event => event.stopPropagation()}
    >
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text">{item.label}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="tabular-nums">{amount}</span>
            <span aria-hidden="true">·</span>
            <span>{statusLabel}</span>
          </div>
        </div>
        <button
          type="button"
          aria-label={`${actionLabel}: ${item.label}`}
          onClick={onToggle}
          className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] border border-[var(--border-strong)] bg-surface px-3 text-xs font-semibold text-text transition-colors active:bg-surface-muted sm:w-auto ${focusRingClasses}`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};

const AllExcludedState: React.FC<AllExcludedStateProps> = ({
  title,
  hint,
  restoreLabel,
  onRestore,
}) => (
  <div
    className="mx-auto mt-3 flex min-h-60 w-full max-w-[360px] flex-col items-center justify-center bg-surface-muted px-5 text-center"
    onClick={event => event.stopPropagation()}
    role="status"
  >
    <p className="text-sm font-semibold leading-5 text-text">{title}</p>
    <p className="mt-2 max-w-xs text-sm leading-5 text-text">{hint}</p>
    <button
      type="button"
      onClick={onRestore}
      className={`mt-4 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-[10px] border border-[var(--border-strong)] bg-surface px-4 text-sm font-semibold text-text transition-colors active:bg-bg-subtle ${focusRingClasses}`}
    >
      {restoreLabel}
    </button>
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
  const descriptionId = useId();
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
    () => legendData.find(item => item.id === selectedId) ?? null,
    [legendData, selectedId],
  );
  const hasSourceData = allChartData.length > 0;
  const hasVisibleData = visibleChartData.length > 0;
  const hasExclusions = allowExclusion && excludedIds.size > 0;

  useEffect(() => {
    const availableIds = new Set(allChartData.map(item => item.id));

    setExcludedIds(current => {
      const next = new Set([...current].filter(id => availableIds.has(id)));
      const unchanged = next.size === current.size
        && [...next].every(id => current.has(id));
      return unchanged ? current : next;
    });
  }, [allChartData]);

  useEffect(() => {
    if (selectedId && !allChartData.some(item => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [allChartData, selectedId]);

  useEffect(() => {
    if (!allowExclusion) {
      setExcludedIds(current => current.size > 0 ? new Set() : current);
    }
  }, [allowExclusion]);

  const formatMoney = (value: number) => (
    showAmounts ? formatAmount(value, locale) : HIDDEN_AMOUNT
  );
  const totalAmount = formatMoney(visibleTotal);
  const legendInitialCount = 5;
  const collapsedLegendItems = useMemo(() => {
    const initialItems = legendData.slice(0, legendInitialCount);
    const pinnedItems = legendData.filter(item => item.excluded || item.id === selectedId);
    const collapsedIds = new Set(initialItems.map(item => item.id));

    return [
      ...initialItems,
      ...pinnedItems.filter(item => !collapsedIds.has(item.id)),
    ];
  }, [legendData, selectedId]);
  const legendItems = showAllLegend ? legendData : collapsedLegendItems;
  const hiddenLegendCount = Math.max(0, legendData.length - collapsedLegendItems.length);
  const showLegendToggle = showAllLegend
    ? legendData.length > legendInitialCount
    : hiddenLegendCount > 0;
  const legendToggleLabel = showAllLegend
    ? t('reports.show_less_categories')
    : replacePlaceholders(t('reports.show_more_categories'), { count: hiddenLegendCount });
  const displayedTotalLabel = hasExclusions
    ? t('reports.displayed_total_expense')
    : totalLabel;
  const visibleCountLabel = replacePlaceholders(
    t('reports.categories_visible_count'),
    { count: visibleChartData.length },
  );
  const excludedCountLabel = replacePlaceholders(
    t('reports.categories_excluded_count'),
    { count: excludedIds.size },
  );
  const filterSummary = allowExclusion
    ? `${visibleCountLabel}${hasExclusions ? ` · ${excludedCountLabel}` : ''}`
    : undefined;
  const chartDescription = replacePlaceholders(
    t('reports.chart_accessible_summary'),
    {
      visibleCount: visibleChartData.length,
      totalLabel: displayedTotalLabel,
      total: totalAmount,
    },
  );
  const centerContent: DonutCenterLabelProps = selectedItem
    ? {
        label: selectedItem.label,
        amount: formatMoney(selectedItem.amount),
        percent: selectedItem.excluded ? undefined : selectedItem.percentLabel,
        status: selectedItem.excluded ? t('reports.excluded_from_chart') : undefined,
      }
    : {
        label: displayedTotalLabel,
        amount: totalAmount,
      };

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
      <section
        className="rounded-2xl border border-border bg-surface p-4"
        aria-busy="true"
        aria-label={`${title}: ${t('common.loading')}`}
      >
        <div className="h-5 w-40 rounded-lg bg-surface-muted" />
        <div className="mx-auto mt-3 flex h-60 w-full max-w-[360px] items-center justify-center">
          <div className="h-44 w-44 rounded-full border-[24px] border-surface-muted" />
        </div>
        <div className="mt-3 h-14 rounded-xl bg-surface-muted" />
        <div className="mt-3 space-y-2 border-t border-border pt-2">
          <div className="h-11 rounded-xl bg-surface-muted" />
          <div className="h-11 rounded-xl bg-surface-muted" />
          <div className="h-11 rounded-xl bg-surface-muted" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4" aria-label={ariaLabel}>
        <h3 className="text-sm font-bold text-text">{title}</h3>
        <div
          className="mt-4 rounded-xl border border-[var(--danger)] bg-[var(--negative-soft)] p-3 text-sm leading-5 text-text"
          role="alert"
        >
          {error}
        </div>
      </section>
    );
  }

  if (!hasSourceData) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4" aria-label={ariaLabel}>
        <h3 className="text-sm font-bold text-text">{title}</h3>
        <div className="mt-4 flex min-h-40 items-center justify-center bg-surface-muted px-4 text-center text-sm leading-5 text-text">
          {emptyMessage}
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border border-border bg-surface p-4"
      onClick={() => setSelectedId(null)}
      aria-label={ariaLabel}
    >
      <DonutHeader
        title={title}
        summary={filterSummary}
        restoreLabel={t('reports.restore_all_categories')}
        showRestore={hasExclusions && hasVisibleData}
        onRestore={restoreAll}
      />
      <p id={descriptionId} className="sr-only" aria-live="polite">
        {chartDescription}
      </p>

      {hasVisibleData ? (
        <DonutChart
          ariaLabel={ariaLabel}
          descriptionId={descriptionId}
          items={visibleChartData}
          selectedId={selectedId}
          center={centerContent}
        />
      ) : (
        <AllExcludedState
          title={t('reports.all_categories_excluded')}
          hint={t('reports.all_categories_excluded_hint')}
          restoreLabel={t('reports.restore_all_categories')}
          onRestore={restoreAll}
        />
      )}

      {allowExclusion && selectedItem && (
        <SelectedCategoryAction
          item={selectedItem}
          amount={formatMoney(selectedItem.amount)}
          includedLabel={t('reports.included_in_chart')}
          excludedLabel={t('reports.excluded_from_chart')}
          excludeLabel={t('reports.exclude_from_chart')}
          includeLabel={t('reports.include_in_chart')}
          onToggle={() => {
            toggleExcluded(selectedItem.id);
            setSelectedId(null);
          }}
        />
      )}

      <div
        className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-border pt-3"
        data-testid="displayed-total"
      >
        <div className="min-w-0">
          <div className="text-xs font-semibold text-muted">{displayedTotalLabel}</div>
          {hasExclusions && (
            <div className="mt-1 text-xs leading-4 text-muted">
              {t('reports.chart_filter_scope_hint')}
            </div>
          )}
        </div>
        <div className="max-w-[11rem] break-words text-right text-base font-bold leading-tight text-text tabular-nums">
          {totalAmount}
        </div>
      </div>

      <DonutLegend
        items={legendItems}
        selectedId={selectedId}
        formatAmount={formatMoney}
        excludedLabel={t('reports.excluded_from_chart')}
        ariaLabel={title}
        onSelect={item => setSelectedId(currentId => currentId === item.id ? null : item.id)}
      />
      {showLegendToggle && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowAllLegend(value => !value);
          }}
          className={`mt-1 inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-[10px] text-center text-xs font-semibold text-text transition-colors active:bg-bg-subtle ${focusRingClasses}`}
        >
          {legendToggleLabel}
        </button>
      )}
    </section>
  );
};
