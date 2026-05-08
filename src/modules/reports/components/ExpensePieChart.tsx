import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CategorySummary } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';

interface Props {
  data: CategorySummary[];
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

export const ExpensePieChart: React.FC<Props> = ({ data }) => {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  const fmtTooltip = (value: any) => formatAmount(Number(value || 0), locale);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow h-80 flex items-center justify-center border border-gray-100">
        <div className="text-gray-400">{t('reports.no_expense_data')}</div>
      </div>
    );
  }

  const chartData = data.map(d => ({
    name: d.category_name,
    value: d.amount,
  }));

  return (
    <div className="bg-white p-4 rounded-lg shadow h-80 mb-6 border border-gray-100" style={{ minHeight: '320px' }}>
      <h3 className="text-lg font-semibold mb-2 text-gray-800">{t('reports.expense_by_category')}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius="80%"
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={fmtTooltip} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
