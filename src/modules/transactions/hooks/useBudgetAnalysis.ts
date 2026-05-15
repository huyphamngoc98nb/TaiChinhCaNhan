import { useMemo } from 'react';
import { useBudgets } from '@/modules/budgets/hooks/useBudgets';
import { getTopBudgets } from '../services/build-dashboard-view-model';

export function useBudgetAnalysis() {
  const { alerts, allProgress, isLoading, error, refresh } = useBudgets();

  const topBudgets = useMemo(() => getTopBudgets(allProgress), [allProgress]);

  return {
    alerts,
    allProgress,
    topBudgets,
    hasAlerts: alerts.length > 0,
    loading: isLoading,
    error,
    refresh,
  };
}
