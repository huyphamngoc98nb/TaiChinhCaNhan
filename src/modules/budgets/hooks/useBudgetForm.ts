import { useState, useCallback, useMemo } from 'react';
import { CategoryBudget, BudgetPeriod } from '../domain/budget.model';
import { SQLiteBudgetRepository } from '../repositories/sqlite-budget.repository';
import { UpsertCategoryBudgetUseCase } from '../services/upsert-category-budget';
import { useToast } from '@/shared/components/Toast/ToastContext';

export function useBudgetForm(onSuccess?: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryBudget | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const toast = useToast();

  const repository = useMemo(() => new SQLiteBudgetRepository(), []);
  const upsertUseCase = useMemo(() => new UpsertCategoryBudgetUseCase(repository), [repository]);

  const open = useCallback((category: CategoryBudget) => {
    setSelectedCategory(category);
    setAmount(category.budget_amount ? category.budget_amount.toString() : '');
    setPeriod(category.budget_period || 'monthly');
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
      setValidationError('Budget amount must be greater than 0');
      return;
    }

    setIsSaving(true);
    try {
      await upsertUseCase.execute(selectedCategory.category_id, parsedAmount, period);
      toast.success('Budget updated ✓');
      onSuccess?.();
      close();
    } catch (e: any) {
      setValidationError(e.message || 'Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedCategory) return;
    
    setIsSaving(true);
    try {
      await upsertUseCase.execute(selectedCategory.category_id, null, null);
      toast.success('Budget limit removed');
      onSuccess?.();
      close();
    } catch (e: any) {
      setValidationError(e.message || 'Failed to remove budget');
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
    handleSave,
    handleRemove,
    isSaving,
    validationError,
  };
}
