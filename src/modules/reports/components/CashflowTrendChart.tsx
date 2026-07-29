import React, { useId, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import type { XAxisTickContentProps } from 'recharts';
import type { PeriodSummary } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { getAppLocale } from '@/shared/utils/locale';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import { formatAppDate, formatAppMonth } from '@/shared/utils/display-format';

interface Props {
  data: PeriodSummary[];
}

export type CashflowMetric = 'income' | 'expense' | 'net';

export interface CashflowTrendDatum extends PeriodSummary {
  net: number;
}

interface CashflowXAxisTickProps extends XAxisTickContentProps {
  formatPeriod: (period: unknown) => string;
}

const METRIC_COLORS: Record<CashflowMetric, string> = {
  income: 'var(--chart-income)',
  expense: 'var(--chart-expense)',
  net: 'var(--chart-net)',
};

export function buildCashflowTrendData(data: PeriodSummary[]): CashflowTrendDatum[] {
  return data.map((item) => ({
    ...item,
    net: item.income - item.expense,
  }));
}

export function getCashflowXAxisTicks(data: PeriodSummary[], maxTicks = 4): string[] {
  if (data.length <= maxTicks) return data.map((item) => item.period);

  const lastIndex = data.length - 1;
  return Array.from(
    new Set(
      Array.from({ length: maxTicks }, (_, index) => (
        data[Math.round((lastIndex * index) / (maxTicks - 1))].period
      ))
    )
  );
}

const CashflowXAxisTick: React.FC<CashflowXAxisTickProps> = ({
  x,
  y,
  payload,
  formatPeriod,
}) => (
  <text
    x={x}
    y={y}
    dy={16}
    textAnchor="middle"
    fill="var(--chart-label)"
    fontSize={12}
    tabIndex={-1}
    focusable="false"
    aria-hidden="true"
    style={{ outline: 'none', pointerEvents: 'none' }}
  >
    {formatPeriod(payload.value)}
  </text>
);

export const CashflowTrendChart: React.FC<Props> = ({ data }) => {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const displayFormatSettings = useDisplayFormatSettings();
  const locale = getAppLocale(language);
  const [metric, setMetric] = useState<CashflowMetric>('income');
  const summaryId = useId();
  const focusRingClasses =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring-offset)]';

  const chartData = useMemo(() => buildCashflowTrendData(data), [data]);
  const xAxisTicks = useMemo(() => getCashflowXAxisTicks(data), [data]);
  const metrics = [
    { key: 'income' as const, label: t('reports.bar_income') },
    { key: 'expense' as const, label: t('reports.bar_expense') },
    { key: 'net' as const, label: t('reports.net_cashflow') },
  ];
  const activeMetric = metrics.find((item) => item.key === metric) ?? metrics[0];
  const activeColor = METRIC_COLORS[metric];
  const replacePlaceholders = (
    template: string,
    values: Record<string, string | number>,
  ) => Object.entries(values).reduce(
    (message, [key, value]) => message.split(`{${key}}`).join(String(value)),
    template,
  );

  const formatTooltipValue = (value: unknown) => (
    showAmounts ? formatAmount(Number(value || 0), locale) : HIDDEN_AMOUNT
  );
  const formatPeriod = (period: unknown) => {
    const value = String(period ?? '');
    const parts = value.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      return formatAppDate(
        new Date(year, month - 1, day).getTime(),
        displayFormatSettings
      );
    }
    if (parts.length === 2) {
      const [year, month] = parts.map(Number);
      if (month >= 1 && month <= 12) {
        return formatAppMonth(
          new Date(year, month - 1, 1).getTime(),
          displayFormatSettings,
          locale
        );
      }
    }
    return value;
  };

  if (!data || data.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-base font-bold leading-5 text-text">{t('reports.cashflow_title')}</h2>
        <div className="mt-4 flex min-h-40 items-center justify-center bg-surface-muted px-4 text-center text-sm leading-5 text-text">
          {t('reports.no_cashflow_data')}
        </div>
      </section>
    );
  }

  const accessibleSummary = replacePlaceholders(
    t('reports.trend_accessible_summary'),
    { metric: activeMetric.label, count: chartData.length },
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4">
      <h2 className="min-w-0 text-base font-bold leading-5 text-text">
        {t('reports.cashflow_title')}
      </h2>

      <div
        className="mt-3 grid min-w-0 grid-cols-3 gap-1 rounded-xl border border-border bg-surface-muted p-1"
        role="tablist"
        aria-label={t('reports.cashflow_title')}
      >
        {metrics.map((item) => {
          const selected = metric === item.key;
          return (
            <button
              key={item.key}
              id={`cashflow-${item.key}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="cashflow-trend-panel"
              onClick={() => setMetric(item.key)}
              className={`min-h-11 min-w-0 whitespace-nowrap rounded-[10px] border px-1.5 text-xs font-semibold leading-4 transition-colors ${focusRingClasses} ${
                selected
                  ? 'border-[var(--selected-border)] bg-surface text-[var(--selected-text)]'
                  : 'border-transparent text-muted active:bg-surface'
              }`}
            >
              <span className="block">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div
        id="cashflow-trend-panel"
        role="tabpanel"
        aria-labelledby={`cashflow-${metric}-tab`}
        aria-describedby={summaryId}
        className="cashflow-chart-frame min-w-0 pt-2"
      >
        <div
          className="h-[220px] min-w-0 overflow-hidden"
          aria-hidden={showAmounts ? undefined : true}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              accessibilityLayer={showAmounts}
              data={chartData}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              style={{ touchAction: 'pan-y' }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="period"
                axisLine={false}
                tickLine={false}
                ticks={xAxisTicks}
                interval={0}
                padding={{ left: 28, right: 28 }}
                tick={(tickProps) => (
                  <CashflowXAxisTick {...tickProps} formatPeriod={formatPeriod} />
                )}
                tickFormatter={formatPeriod}
                tickMargin={8}
              />
              {metric === 'net' && (
                <ReferenceLine y={0} stroke="var(--chart-muted)" strokeDasharray="4 4" />
              )}
              <Tooltip
                formatter={(value) => [formatTooltipValue(value), activeMetric.label]}
                labelFormatter={formatPeriod}
                cursor={{ stroke: activeColor, strokeOpacity: 0.14, strokeWidth: 18 }}
                allowEscapeViewBox={{ x: false, y: false }}
                wrapperStyle={{ maxWidth: 'calc(100% - 16px)', pointerEvents: 'none' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-elevated)',
                  boxShadow: '0 8px 20px var(--shadow-color)',
                  color: 'var(--text)',
                  fontSize: 13,
                  padding: '10px 12px',
                }}
                labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                itemStyle={{ color: activeColor, fontWeight: 600 }}
              />
              <Area
                type="linear"
                dataKey={metric}
                name={activeMetric.label}
                stroke={activeColor}
                strokeWidth={2.5}
                fill={activeColor}
                fillOpacity={0.12}
                dot={chartData.length <= 12 ? { r: 2.5, strokeWidth: 1.5, fill: 'var(--surface)' } : false}
                activeDot={{ r: 6, stroke: 'var(--surface)', strokeWidth: 3 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div id={summaryId} className="sr-only" role="status" aria-live="polite">
          <p>{accessibleSummary}</p>
          <ul>
            {chartData.map(item => (
              <li key={item.period}>
                {replacePlaceholders(
                  t('reports.trend_data_point'),
                  {
                    period: formatPeriod(item.period),
                    amount: formatTooltipValue(item[metric]),
                  },
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
