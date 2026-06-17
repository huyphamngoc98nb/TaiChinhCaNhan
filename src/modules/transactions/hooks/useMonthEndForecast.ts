import { useCallback, useEffect, useMemo, useState } from 'react';
import { appRepositories } from '@/core/repositories/app-repositories';
import { buildDateRange } from '@/modules/reports/services/build-date-range';
import {
  calculateMonthMetrics,
  type FinancialMonthMetrics,
} from '@/modules/reports/services/financial-calculations';
import type { BudgetProgress } from '@/modules/budgets/domain/budget.model';
import { useLanguage } from '@/shared/context/LanguageContext';

export function useMonthEndForecast(totalBalance: number, budgetProgress: BudgetProgress[]) {
  const { t } = useLanguage();
  const [forecast, setForecast] = useState<FinancialMonthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxProjectedBudgetUsage = useMemo(
    () => budgetProgress.reduce(
      (max, progress) => Math.max(max, progress.projected_percentage ?? progress.percentage),
      0,
    ),
    [budgetProgress],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const repo = appRepositories.report;
      const currentRange = buildDateRange('this_month');
      const previousRange = buildDateRange('last_month');
      const [current, previous] = await Promise.all([
        repo.getCashflowSummary(currentRange),
        repo.getCashflowSummary(previousRange),
      ]);

      setForecast(calculateMonthMetrics({
        current,
        previous,
        currentRange,
        totalBalance,
        maxProjectedBudgetUsage,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('transactions.loading_forecast_failed'));
    } finally {
      setLoading(false);
    }
  }, [maxProjectedBudgetUsage, totalBalance, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    forecast,
    loading,
    error,
    refresh: load,
  };
}
