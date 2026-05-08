import { useState, useEffect, useCallback, useMemo } from 'react';
import { BudgetWithCategory, BudgetProgress } from '../domain/budget.model';
import { SQLiteBudgetRepository } from '../repositories/sqlite-budget.repository';
import { GetBudgetSettingsUseCase } from '../services/get-budget-settings';
import { ListBudgetAlertsUseCase } from '../services/list-budget-alerts';

export function useBudgets(walletId?: string) {
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [allProgress, setAllProgress] = useState<BudgetProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => new SQLiteBudgetRepository(), []);
  const getSettingsUseCase = useMemo(() => new GetBudgetSettingsUseCase(repository), [repository]);
  const listAlertsUseCase = useMemo(() => new ListBudgetAlertsUseCase(repository), [repository]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [budgetList, progress] = await Promise.all([
        getSettingsUseCase.execute(walletId),
        listAlertsUseCase.execute(walletId),
      ]);
      setBudgets(budgetList);
      setAllProgress(progress);
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load budgets';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [getSettingsUseCase, listAlertsUseCase, walletId]);

  useEffect(() => {
    load();
  }, [load]);

  const summaryStats = useMemo(() => {
    const stats = { healthy: 0, warning: 0, over: 0 };
    allProgress.forEach(p => {
      if (p.status === 'exceeded') stats.over++;
      else if (p.status === 'warning') stats.warning++;
      else stats.healthy++;
    });
    return stats;
  }, [allProgress]);

  const alerts = useMemo(
    () => allProgress.filter(p => p.status === 'warning' || p.status === 'exceeded'),
    [allProgress]
  );

  return {
    budgets,
    allProgress,
    summaryStats,
    alerts,
    isLoading,
    error,
    refresh: load,
  };
}
