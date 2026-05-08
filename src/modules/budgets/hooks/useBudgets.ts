import { useState, useEffect, useCallback, useMemo } from 'react';
import { CategoryBudget, BudgetProgress } from '../domain/budget.model';
import { SQLiteBudgetRepository } from '../repositories/sqlite-budget.repository';
import { GetBudgetSettingsUseCase } from '../services/get-budget-settings';
import { ListBudgetAlertsUseCase } from '../services/list-budget-alerts';

export function useBudgets() {
  const [categories, setCategories] = useState<CategoryBudget[]>([]);
  const [allProgress, setAllProgress] = useState<BudgetProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => new SQLiteBudgetRepository(), []);
  const getSettingsUseCase = useMemo(() => new GetBudgetSettingsUseCase(repository), [repository]);
  const listAlertsUseCase = useMemo(() => new ListBudgetAlertsUseCase(repository), [repository]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cats, progress] = await Promise.all([
        getSettingsUseCase.execute(),
        listAlertsUseCase.execute()
      ]);
      setCategories(cats);
      setAllProgress(progress);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load budgets');
    } finally {
      setIsLoading(false);
    }
  }, [getSettingsUseCase, listAlertsUseCase]);

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

  const alerts = useMemo(() => 
    allProgress.filter(p => p.status === 'warning' || p.status === 'exceeded'),
    [allProgress]
  );

  return { 
    categories, 
    allProgress,
    summaryStats,
    alerts,
    isLoading, 
    error, 
    refresh: load 
  };
}
