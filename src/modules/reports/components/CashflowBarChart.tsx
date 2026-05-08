import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow h-80 flex items-center justify-center border border-gray-100">
        <div className="text-gray-400">{t('reports.no_cashflow_data')}</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow h-80 mb-6 border border-gray-100" style={{ minHeight: '320px' }}>
      <h3 className="text-lg font-semibold mb-2 text-gray-800">{t('reports.cashflow_title')}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} tickMargin={10} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={fmtTooltip} cursor={{ fill: '#f9fafb' }} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="income" fill="#10B981" name={t('reports.bar_income')} radius={[2, 2, 0, 0]} maxBarSize={40} />
          <Bar dataKey="expense" fill="#EF4444" name={t('reports.bar_expense')} radius={[2, 2, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
