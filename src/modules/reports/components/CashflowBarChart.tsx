import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { PeriodSummary } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { getAppLocale } from '@/shared/utils/locale';

interface Props {
  data: PeriodSummary[];
}

export const CashflowBarChart: React.FC<Props> = ({ data }) => {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const [view, setView] = React.useState<'cashflow' | 'balance'>('cashflow');
  const locale = getAppLocale(language);

  const fmtTooltip = (value: any) => formatAmount(Number(value || 0), locale);
  const formatPeriod = (period: unknown) => {
    const value = String(period ?? '');
    const parts = value.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      return new Date(year, month - 1, day).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
      });
    }
    if (parts.length === 2) {
      const [year, month] = parts.map(Number);
      if (month >= 1 && month <= 12) {
        return new Date(year, month - 1, 1).toLocaleDateString(locale, {
          month: 'short',
          year: '2-digit',
        });
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

  const chartData = data.reduce<Array<PeriodSummary & { balance: number }>>((items, item) => {
    const previousBalance = items[items.length - 1]?.balance || 0;
    items.push({ ...item, balance: previousBalance + item.income - item.expense });
    return items;
  }, []);

  return (
    <div className="mb-5 min-w-0 rounded-[14px] border border-gray-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
        <div>
          <h3 className="min-w-0 truncate text-[15px] font-bold text-gray-900">{t('reports.cashflow_title')}</h3>
          {view === 'cashflow' && (
            <div className="mt-1 flex gap-3 text-[11px] font-semibold">
              <span className="text-emerald-600">{t('reports.bar_income')}</span>
              <span className="text-red-600">{t('reports.bar_expense')}</span>
            </div>
          )}
        </div>
        <div className="inline-grid shrink-0 grid-cols-2 rounded-[11px] bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setView('cashflow')}
            className={`h-8 rounded-[8px] px-3 text-[12px] font-semibold ${view === 'cashflow' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            {t('reports.cashflow_tab')}
          </button>
          <button
            type="button"
            onClick={() => setView('balance')}
            className={`h-8 rounded-[8px] px-3 text-[12px] font-semibold ${view === 'balance' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            {t('reports.balance')}
          </button>
        </div>
      </div>

      <div className="h-[220px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'cashflow' ? (
            <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={2}>
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
          ) : (
            <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
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
                cursor={{ stroke: '#d1d5db' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="balance" name={t('reports.balance')} stroke="#2563EB" fill="#DBEAFE" strokeWidth={2} />
            </AreaChart>
          )}
      </ResponsiveContainer>
      </div>
    </div>
  );
};
