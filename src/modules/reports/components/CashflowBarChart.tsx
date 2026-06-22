import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { XAxisTickContentProps } from 'recharts';
import { PeriodSummary } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { getAppLocale } from '@/shared/utils/locale';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import { formatAppDate, formatAppMonth } from '@/shared/utils/display-format';

interface Props {
  data: PeriodSummary[];
}

interface CashflowXAxisTickProps extends XAxisTickContentProps {
  formatPeriod: (period: unknown) => string;
}

const CashflowXAxisTick: React.FC<CashflowXAxisTickProps> = ({ x, y, payload, formatPeriod }) => (
  <text
    x={x}
    y={y}
    dy={16}
    textAnchor="middle"
    fill="var(--text-subtle)"
    fontSize={11}
    tabIndex={-1}
    focusable="false"
    aria-hidden="true"
    style={{ outline: 'none', pointerEvents: 'none' }}
  >
    {formatPeriod(payload.value)}
  </text>
);

export const CashflowBarChart: React.FC<Props> = ({ data }) => {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const displayFormatSettings = useDisplayFormatSettings();
  const locale = getAppLocale(language);

  const fmtTooltip = (value: any) => showAmounts ? formatAmount(Number(value || 0), locale) : HIDDEN_AMOUNT;
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
      <div className="flex min-h-[240px] items-center justify-center rounded-[14px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-400">{t('reports.no_cashflow_data')}</div>
      </div>
    );
  }

  return (
    <div className="mb-5 min-w-0 rounded-[14px] border border-gray-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <div>
          <h3 className="min-w-0 truncate text-[15px] font-bold text-gray-900">{t('reports.cashflow_title')}</h3>
          <div className="mt-1 flex gap-3 text-[11px] font-semibold">
            <span className="text-emerald-600">{t('reports.bar_income')}</span>
            <span className="text-red-600">{t('reports.bar_expense')}</span>
          </div>
        </div>
      </div>

      <div
        className="cashflow-chart-frame h-[220px] min-w-0"
        onMouseDown={(event) => event.preventDefault()}
        onFocus={(event) => {
          if (event.target instanceof HTMLElement) event.target.blur();
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            tabIndex={-1}
            data={data}
            margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={14}
              tick={(tickProps) => <CashflowXAxisTick {...tickProps} formatPeriod={formatPeriod} />}
              tickFormatter={formatPeriod}
              tickMargin={8}
            />
            <Tooltip
              formatter={fmtTooltip}
              labelFormatter={formatPeriod}
              cursor={false}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                boxShadow: '0 8px 20px var(--shadow-color)',
                color: 'var(--text)',
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--text)' }}
              itemStyle={{ color: 'var(--text)' }}
            />
            <Bar dataKey="income" fill="#10B981" name={t('reports.bar_income')} radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Bar dataKey="expense" fill="#EF4444" name={t('reports.bar_expense')} radius={[3, 3, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
