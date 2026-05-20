import React from 'react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PeriodSummary } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';

interface Props {
  data: PeriodSummary[];
}

export const CashflowBarChart: React.FC<Props> = ({ data }) => {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  const fmtTooltip = (value: any) => formatAmount(Number(value || 0), locale);
  const formatPeriod = (period: unknown) => {
    const value = String(period ?? '');
    const parts = value.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    if (parts.length === 2) return `${parts[1]}/${parts[0].slice(2)}`;
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
        <h3 className="min-w-0 truncate text-[15px] font-bold text-gray-900">{t('reports.cashflow_title')}</h3>
        <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t('reports.bar_income')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {t('reports.bar_expense')}
          </span>
        </div>
      </div>

      <div className="h-[220px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={14}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={formatPeriod}
              tickMargin={8}
            />
            <Tooltip
              formatter={fmtTooltip}
              labelFormatter={formatPeriod}
              cursor={{ fill: '#f9fafb' }}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                fontSize: 12,
              }}
            />
            <Bar dataKey="income" fill="#10B981" name={t('reports.bar_income')} radius={[3, 3, 0, 0]} maxBarSize={26} />
            <Bar dataKey="expense" fill="#EF4444" name={t('reports.bar_expense')} radius={[3, 3, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};
