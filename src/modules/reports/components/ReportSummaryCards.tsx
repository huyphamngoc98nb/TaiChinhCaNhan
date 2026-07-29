import React from 'react';
import { CashflowSummary } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { ArrowDownCircle, ArrowDownRight, ArrowUpCircle, ArrowUpRight } from 'lucide-react';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';

interface Props {
  data: CashflowSummary | null;
  previousData: CashflowSummary | null;
  loading: boolean;
}

const percentChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
};

export const ReportSummaryCards: React.FC<Props> = ({ data, previousData, loading }) => {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const displayAmount = (amount: number) => showAmounts ? formatAmount(amount, locale) : HIDDEN_AMOUNT;

  if (loading) {
    return (
      <div className="grid grid-cols-1 divide-y divide-border border-t border-border min-[360px]:grid-cols-2 min-[360px]:divide-x min-[360px]:divide-y-0" aria-busy="true">
        {[0, 1].map(item => (
          <div key={item} className="space-y-2 p-4" aria-hidden="true">
            <div className="h-4 w-20 rounded bg-surface-muted" />
            <div className="h-7 w-32 max-w-full rounded bg-surface-muted" />
            <div className="h-4 w-24 rounded bg-surface-muted" />
          </div>
        ))}
        <span className="sr-only">{t('reports.loading_summaries')}</span>
      </div>
    );
  }

  const income = data?.totalIncome || 0;
  const expense = data?.totalExpense || 0;
  const cards = [
    {
      label: t('reports.income'),
      value: income,
      previousValue: previousData?.totalIncome || 0,
      icon: ArrowUpCircle,
      iconClassName: 'text-[var(--success)]',
      amountClassName: 'text-[var(--success)]',
    },
    {
      label: t('reports.expense'),
      value: expense,
      previousValue: previousData?.totalExpense || 0,
      icon: ArrowDownCircle,
      iconClassName: 'text-[var(--chart-expense)]',
      amountClassName: 'text-[var(--chart-expense)]',
    },
  ];

  return (
    <div className="grid grid-cols-1 divide-y divide-border border-t border-border min-[360px]:grid-cols-2 min-[360px]:divide-x min-[360px]:divide-y-0">
      {cards.map((card) => {
        const Icon = card.icon;
        const change = percentChange(card.value, card.previousValue);
        const ChangeIcon = change >= 0 ? ArrowUpRight : ArrowDownRight;
        return (
          <div
            key={card.label}
            className="min-w-0 p-4"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Icon size={18} className={`shrink-0 ${card.iconClassName}`} />
              <span className="min-w-0 truncate text-sm font-semibold text-muted">
                {card.label}
              </span>
            </div>
            <div
              className={`mt-2 break-words text-xl font-bold leading-6 tabular-nums ${card.amountClassName}`}
            >
              {displayAmount(card.value)}
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted">
              <ChangeIcon size={14} aria-hidden="true" />
              <span>{change >= 0 ? '+' : ''}{change.toFixed(0)}%</span>
              <span className="font-normal">{t('reports.compared_with_previous_period')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
