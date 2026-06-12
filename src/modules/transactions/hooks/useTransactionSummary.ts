import { useCallback, useEffect, useState } from 'react';
import { listTransactionsUseCase } from '@/core/di/transactions.di';
import { buildDateRange } from '@/modules/reports/services/build-date-range';

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}

export function useTransactionSummary() {
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

      const nextSummary = transactions.reduce<TransactionSummary>(
        (acc, transaction) => {
          if (transaction.exclude_from_total) return acc;
          if (transaction.type === 'income') {
            acc.totalIncome += transaction.amount;
          } else if (transaction.type === 'expense') {
            acc.totalExpense += transaction.amount;
          }
          acc.netAmount = acc.totalIncome - acc.totalExpense;
          return acc;
        },
        { totalIncome: 0, totalExpense: 0, netAmount: 0 }
      );

      setSummary(nextSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction summary');
    } finally {
      setLoading(false);
    }
  }, []);

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
