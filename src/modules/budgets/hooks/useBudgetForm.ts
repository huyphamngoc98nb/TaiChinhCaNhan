import { useState, useCallback, useMemo } from 'react';
import { BudgetWithCategory, BudgetPeriod } from '../domain/budget.model';
import { SQLiteBudgetRepository } from '../repositories/sqlite-budget.repository';
import { UpsertCategoryBudgetUseCase } from '../services/upsert-category-budget';
import { useToast } from '@/shared/components/Toast/ToastContext';

export function useBudgetForm(onSuccess?: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithCategory | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const toast = useToast();

  const repository = useMemo(() => new SQLiteBudgetRepository(), []);
  const upsertUseCase = useMemo(() => new UpsertCategoryBudgetUseCase(repository), [repository]);

  /**
   * Mở form edit. Nếu category chưa có budget thì khởi tạo giá trị mặc định.
   */
  const open = useCallback((budget: BudgetWithCategory) => {
    setSelectedBudget(budget);
    setAmount(budget.amount ? budget.amount.toString() : '');
    setPeriod(budget.period || 'monthly');
    setValidationError(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedBudget(null);
  }, []);

  const handleSave = async () => {
    if (!selectedBudget) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Budget amount must be greater than 0');
      return;
    }

    setIsSaving(true);
    try {
      await upsertUseCase.execute(
        selectedBudget.category_id,
        parsedAmount,
        period,
        selectedBudget.wallet_id
      );
      toast.success('Budget updated ✓');
      onSuccess?.();
      close();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save budget';
      setValidationError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedBudget) return;

    setIsSaving(true);
    try {
      await upsertUseCase.execute(
        selectedBudget.category_id,
        null,
        null,
        selectedBudget.wallet_id
      );
      toast.success('Budget limit removed');
      onSuccess?.();
      close();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to remove budget';
      setValidationError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isOpen,
    selectedBudget,
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
