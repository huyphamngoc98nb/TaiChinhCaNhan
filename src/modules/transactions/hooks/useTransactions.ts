import { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionFilter } from '../domain/transaction.model';
import { listTransactionsUseCase, deleteTransactionUseCase } from '@/core/di/transactions.di';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useLanguage } from '@/shared/context/LanguageContext';

export function useTransactions(initialFilter?: TransactionFilter) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TransactionFilter>(initialFilter || {});
  const toast = useToast();
  const { t } = useLanguage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTransactionsUseCase.execute(filter);
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    try {
      await deleteTransactionUseCase.execute(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success(t('transactions.delete_success'));
    } catch (e: any) {
      console.error('Failed to delete transaction', e);
      toast.error(e.message || t('transactions.delete_failed'));
      throw e;
    }
  };

  return { transactions, loading, filter, setFilter, reload: load, remove };
}
