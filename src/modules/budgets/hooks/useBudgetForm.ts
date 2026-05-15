import { useState, useCallback, useMemo } from 'react';
import {
  CategoryBudget,
  BudgetPeriod,
  AccountType,
} from '../domain/budget.model';
import { UpsertCategoryBudgetUseCase } from '../services/upsert-category-budget';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { appRepositories } from '@/core/repositories/app-repositories';

export type BudgetScopeType = 'global' | 'account_type';

export function useBudgetForm(onSuccess?: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryBudget | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [scopeType, setScopeType] = useState<BudgetScopeType>('global');
  const [accountTypeScope, setAccountTypeScope] = useState<AccountType>('credit_card');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const toast = useToast();

  const upsertUseCase = useMemo(
    () => new UpsertCategoryBudgetUseCase(appRepositories.budget),
    []
  );

  const open = useCallback((category: CategoryBudget) => {
    setSelectedCategory(category);
    setAmount(category.budget_amount ? category.budget_amount.toString() : '');
    setPeriod(category.budget_period || 'monthly');
    setScopeType('global');
    setAccountTypeScope('credit_card');
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
      setValidationError('Số tiền ngân sách phải lớn hơn 0');
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
      toast.success('Đã lưu ngân sách ✓');
      onSuccess?.();
      close();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể lưu ngân sách';
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
      toast.success('Đã xoá giới hạn ngân sách');
      onSuccess?.();
      close();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể xoá ngân sách';
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
