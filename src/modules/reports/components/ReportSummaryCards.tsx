import React from 'react';
import { CashflowSummary } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';

interface Props {
  data: CashflowSummary | null;
  loading: boolean;
}

export const ReportSummaryCards: React.FC<Props> = ({ data, loading }) => {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  if (loading) {
    return <div className="grid grid-cols-3 gap-4 mb-6 text-gray-500">{t('reports.loading_summaries')}</div>;
  }

  const income = data?.totalIncome || 0;
  const expense = data?.totalExpense || 0;
  const net = data?.netAmount || 0;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-sm text-gray-500 font-medium">{t('reports.income')}</div>
        <div className="text-lg sm:text-xl font-bold text-green-600">{formatAmount(income, locale)}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-sm text-gray-500 font-medium">{t('reports.expense')}</div>
        <div className="text-lg sm:text-xl font-bold text-red-600">{formatAmount(expense, locale)}</div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <div className="text-sm text-gray-500 font-medium">{t('reports.net')}</div>
        <div className={`text-lg sm:text-xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatAmount(net, locale)}
        </div>
      </div>
    </div>
  );
};
