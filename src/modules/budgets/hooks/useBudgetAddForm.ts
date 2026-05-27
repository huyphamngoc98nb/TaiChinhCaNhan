import { useState, useCallback, useMemo } from 'react';
import {
  AccountType,
  CategoryBudget,
  BudgetPeriod,
} from '../domain/budget.model';
import { UpsertCategoryBudgetUseCase } from '../services/upsert-category-budget';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { appRepositories } from '@/core/repositories/app-repositories';
import { useLanguage } from '@/shared/context/LanguageContext';
import type { BudgetScopeType } from './useBudgetForm';

const MAX_BUDGET_AMOUNT = 999_000_000_000;

export function useBudgetAddForm(onSuccess?: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategoryState] = useState<CategoryBudget | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [scopeType, setScopeType] = useState<BudgetScopeType>('global');
  const [accountTypeScope, setAccountTypeScope] = useState<AccountType>('credit_card');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useLanguage();

  const upsertUseCase = useMemo(
    () => new UpsertCategoryBudgetUseCase(appRepositories.budget),
    []
  );

  const open = useCallback(() => {
    setSelectedCategoryState(null);
    setAmount('');
    setPeriod('monthly');
    setScopeType('global');
    setAccountTypeScope('credit_card');
    setError(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedCategoryState(null);
  }, []);

  const setSelectedCategory = useCallback((category: CategoryBudget) => {
    setSelectedCategoryState(category);
    setError(null);
  }, []);

  const handleSave = async () => {
    if (!selectedCategory) {
      setError(t('budgets.select_category_required'));
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t('budgets.amount_required'));
      return;
    }
    if (parsedAmount > MAX_BUDGET_AMOUNT) {
      setError(t('budgets.amount_too_large'));
      return;
    }

    setIsSaving(true);
    try {
      await upsertUseCase.execute(
        selectedCategory.category_id,
        parsedAmount,
        period,
        scopeType === 'account_type' ? accountTypeScope : null
      );
      toast.success(t('budgets.budget_updated'));
      onSuccess?.();
      close();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('budgets.save_failed');
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isOpen,
    selectedCategory,
    setSelectedCategory,
    open,
    close,
    amount,
    setAmount,
    period,
    setPeriod,
    scopeType,
    setScopeType,
    accountTypeScope,
    setAccountTypeScope,
    isSaving,
    error,
    handleSave,
  };
}
