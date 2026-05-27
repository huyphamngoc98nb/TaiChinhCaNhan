import { useState, useCallback, useMemo } from 'react';
import {
  CategoryBudget,
  BudgetPeriod,
  AccountType,
} from '../domain/budget.model';
import { UpsertCategoryBudgetUseCase } from '../services/upsert-category-budget';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { appRepositories } from '@/core/repositories/app-repositories';
import { useLanguage } from '@/shared/context/LanguageContext';

const MAX_BUDGET_AMOUNT = 999_000_000_000; // 999 billion

export type BudgetScopeType = 'global' | 'account_type';
type EditableCategoryBudget = CategoryBudget & {
  budget_account_type_scope?: AccountType | null;
};

export function useBudgetForm(onSuccess?: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EditableCategoryBudget | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [scopeType, setScopeType] = useState<BudgetScopeType>('global');
  const [accountTypeScope, setAccountTypeScope] = useState<AccountType>('credit_card');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const toast = useToast();
  const { t } = useLanguage();

  const upsertUseCase = useMemo(
    () => new UpsertCategoryBudgetUseCase(appRepositories.budget),
    []
  );

  const open = useCallback((category: EditableCategoryBudget) => {
    setSelectedCategory(category);
    setAmount(category.budget_amount ? category.budget_amount.toString() : '');
    setPeriod(category.budget_period || 'monthly');
    setScopeType(category.budget_account_type_scope ? 'account_type' : 'global');
    setAccountTypeScope(category.budget_account_type_scope || 'credit_card');
    setValidationError(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedCategory(null);
  }, []);

  const handleSave = async () => {
    if (!selectedCategory) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError(t('budgets.amount_required'));
      return;
    }
    if (parsedAmount > MAX_BUDGET_AMOUNT) {
      setValidationError(t('budgets.amount_too_large'));
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
      setValidationError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedCategory) return;

    setIsSaving(true);
    try {
      await upsertUseCase.execute(selectedCategory.category_id, null, null, null);
      toast.success(t('budgets.budget_removed'));
      onSuccess?.();
      close();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('budgets.save_failed');
      setValidationError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isOpen,
    selectedCategory,
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
    handleSave,
    handleRemove,
    isSaving,
    validationError,
  };
}
