import { useCallback, useEffect, useState } from 'react';
import { listTransactionsUseCase } from '@/core/di/transactions.di';
import { buildDateRange } from '@/modules/reports/services/build-date-range';
import type { Transaction } from '../domain/transaction.model';
import { useLanguage } from '@/shared/context/LanguageContext';

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}

export function summarizeTransactions(transactions: Transaction[]): TransactionSummary {
  const totals = transactions.reduce(
    (summary, transaction) => {
      if (transaction.exclude_from_total) return summary;
      if (transaction.is_budget_offset) return summary;
      if (transaction.type === 'income') summary.totalIncome += transaction.amount;
      else if (transaction.type === 'expense') summary.totalExpense += transaction.amount;
      return summary;
    },
    { totalIncome: 0, totalExpense: 0 },
  );

  return {
    ...totals,
    netAmount: totals.totalIncome - totals.totalExpense,
  };
}

export function useTransactionSummary() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<TransactionSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const range = buildDateRange('this_month');
      const transactions = await listTransactionsUseCase.execute({
        startDate: range.startDate,
        endDate: range.endDate,
      });

      const nextSummary = summarizeTransactions(transactions);

      setSummary(nextSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('transactions.loading_summary_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...summary,
    loading,
    error,
    refresh: load,
  };
}
