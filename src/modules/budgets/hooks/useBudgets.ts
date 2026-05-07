import { useState, useEffect, useCallback } from 'react';
import { CategoryBudget, BudgetProgress } from '../domain/budget.model';
import { SQLiteBudgetRepository } from '../repositories/sqlite-budget.repository';
import { GetBudgetSettingsUseCase } from '../services/get-budget-settings';
import { UpsertCategoryBudgetUseCase } from '../services/upsert-category-budget';
import { ListBudgetAlertsUseCase } from '../services/list-budget-alerts';

export function useBudgets() {
  const [categories, setCategories] = useState<CategoryBudget[]>([]);
  const [alerts, setAlerts] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = new SQLiteBudgetRepository();
  const getSettingsUseCase = new GetBudgetSettingsUseCase(repository);
  const upsertUseCase = new UpsertCategoryBudgetUseCase(repository);
  const listAlertsUseCase = new ListBudgetAlertsUseCase(repository);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await getSettingsUseCase.execute();
      setCategories(cats);
      
      const alrts = await listAlertsUseCase.execute();
      setAlerts(alrts);
    } catch (e: any) {
      setError(e.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateBudget = async (categoryId: string, amount: number | null, period: 'weekly' | 'monthly' | null) => {
    try {
      await upsertUseCase.execute(categoryId, amount, period);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to update budget');
      throw e;
    }
  };

  return { categories, alerts, loading, error, updateBudget, refresh: load };
}
