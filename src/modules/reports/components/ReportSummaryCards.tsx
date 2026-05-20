import React from 'react';
import { CashflowSummary } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { ArrowDownCircle, ArrowUpCircle, Scale } from 'lucide-react';

interface Props {
  data: CashflowSummary | null;
  loading: boolean;
}

export const ReportSummaryCards: React.FC<Props> = ({ data, loading }) => {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  if (loading) {
    return <div className="mb-5 rounded-[14px] bg-white p-4 text-sm text-gray-500 shadow-sm">{t('reports.loading_summaries')}</div>;
  }

  const income = data?.totalIncome || 0;
  const expense = data?.totalExpense || 0;
  const net = data?.netAmount || 0;
  const cards = [
    {
      label: t('reports.income'),
      value: income,
      icon: ArrowUpCircle,
      iconClassName: 'text-emerald-500',
      amountClassName: 'text-emerald-600',
    },
    {
      label: t('reports.expense'),
      value: expense,
      icon: ArrowDownCircle,
      iconClassName: 'text-red-500',
      amountClassName: 'text-red-600',
    },
    {
      label: t('reports.net'),
      value: net,
      icon: Scale,
      iconClassName: net >= 0 ? 'text-emerald-500' : 'text-red-500',
      amountClassName: net >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="flex min-w-0 items-center gap-3 rounded-[14px] border border-gray-100 bg-white px-3 py-3 shadow-sm sm:flex-col sm:items-start sm:gap-2"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
              <Icon size={18} className={`shrink-0 ${card.iconClassName}`} />
              <span className="truncate text-[12px] font-semibold uppercase text-gray-400">
                {card.label}
              </span>
            </div>
            <div
              className={`min-w-0 flex-1 break-words text-right text-[15px] font-bold leading-tight tabular-nums sm:w-full sm:text-left sm:text-[16px] ${card.amountClassName}`}
            >
              {formatAmount(card.value, locale)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
