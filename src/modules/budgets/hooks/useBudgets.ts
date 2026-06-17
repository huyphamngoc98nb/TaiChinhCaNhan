import { useState, useEffect, useCallback, useMemo } from 'react';
import { CategoryBudget, BudgetProgress, resolveBudgetScope } from '../domain/budget.model';
import { GetBudgetSettingsUseCase } from '../services/get-budget-settings';
import { ListBudgetAlertsUseCase } from '../services/list-budget-alerts';
import { appRepositories } from '@/core/repositories/app-repositories';
import { useLanguage } from '@/shared/context/LanguageContext';

export function useBudgets() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<CategoryBudget[]>([]);
  const [allProgress, setAllProgress] = useState<BudgetProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSettingsUseCase = useMemo(
    () => new GetBudgetSettingsUseCase(appRepositories.budget),
    []
  );
  const listAlertsUseCase = useMemo(
    () => new ListBudgetAlertsUseCase(appRepositories.budget),
    []
  );

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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('budgets.load_failed');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [getSettingsUseCase, listAlertsUseCase, t]);

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

  // Group progress theo scope để UI hiển thị theo tab
  const progressByScope = useMemo(() => ({
    global:        allProgress.filter(p => resolveBudgetScope(p.budget).type === 'global'),
    byWallet:      allProgress.filter(p => resolveBudgetScope(p.budget).type === 'wallet'),
    byAccountType: allProgress.filter(p => resolveBudgetScope(p.budget).type === 'account_type'),
  }), [allProgress]);

  return {
    categories,
    allProgress,
    summaryStats,
    alerts,
    progressByScope,
    isLoading,
    error,
    refresh: load,
  };
}
