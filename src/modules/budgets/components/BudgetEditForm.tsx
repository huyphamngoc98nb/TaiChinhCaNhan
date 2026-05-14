import { X } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { CategoryBudget, BudgetPeriod, AccountType } from '../domain/budget.model';
import { BudgetScopePicker } from './BudgetScopePicker';
import type { BudgetScopeType } from '../hooks/useBudgetForm';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { useCurrency } from '@/shared/context/CurrencyContext';

interface Props {
  category: CategoryBudget;
  amount: string;
  setAmount: (val: string) => void;
  period: BudgetPeriod;
  setPeriod: (val: BudgetPeriod) => void;
  scopeType: BudgetScopeType;
  setScopeType: (val: BudgetScopeType) => void;
  accountTypeScope: AccountType;
  setAccountTypeScope: (val: AccountType) => void;
  onSave: () => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
  error: string | null;
}

export function BudgetEditForm({
  category,
  amount,
  setAmount,
  period,
  setPeriod,
  scopeType,
  setScopeType,
  accountTypeScope,
  setAccountTypeScope,
  onSave,
  onRemove,
  onClose,
  isSaving,
  error,
}: Props) {
  const { t } = useLanguage();
  const { confirm } = useConfirm();
  const { currency } = useCurrency();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: `${category.color}26`, color: category.color }}
          >
            {category.icon || '💰'}
          </div>
          <h4 className="text-[18px] font-semibold text-gray-900">{category.category_name}</h4>
        </div>
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center text-gray-400 bg-gray-100 rounded-full active:bg-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form Body */}
      <div className="flex-1 space-y-6">
        {/* Error banner — same pattern as TransactionForm */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Period Toggle */}
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">{t('budgets.budget_period')}</p>
          <div className="flex bg-gray-100 p-1 rounded-[12px] h-[48px] w-full">
            <button
              onClick={() => setPeriod('monthly')}
              className={`flex-1 flex items-center justify-center rounded-[9px] text-[14px] font-semibold transition-all ${
                period === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('budgets.monthly')}
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`flex-1 flex items-center justify-center rounded-[9px] text-[14px] font-semibold transition-all ${
                period === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('budgets.weekly')}
            </button>
          </div>
        </div>

        {/* Scope Picker */}
        <BudgetScopePicker
          scopeType={scopeType}
          onScopeChange={setScopeType}
          accountTypeScope={accountTypeScope}
          onAccountTypeChange={setAccountTypeScope}
        />

        {/* Amount Input */}
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-gray-700">{t('budgets.amount')}</p>
          <CurrencyAmountInput
            currency={currency}
            value={amount}
            onValueChange={setAmount}
            className={error ? 'border-red-300' : 'border-gray-200'}
            autoFocus
          />
          {!error && (
            <p className="text-[12px] text-gray-400 ml-1 italic">
              {period === 'monthly'
                ? t('budgets.amount_hint_month')
                : t('budgets.amount_hint_week')}
            </p>
          )}
        </div>

        {/* Remove Link */}
        {category.budget_amount !== null && (
          <button
            onClick={async () => {
              const ok = await confirm({
                title: t('budgets.remove_budget'),
                message: t('budgets.remove_confirm'),
                confirmText: t('common.yes'),
                cancelText: t('common.cancel'),
              });
              if (ok) onRemove();
            }}
            className="text-[13px] text-red-500 font-semibold h-11 flex items-center px-1"
          >
            {t('budgets.remove_budget')}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-100">
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`w-full h-[54px] rounded-[14px] bg-indigo-500 text-white text-[16px] font-bold
            transition-all active:scale-[0.98] ${
            isSaving ? 'opacity-50' : 'shadow-lg shadow-indigo-500/20'
          }`}
        >
          {isSaving ? t('common.saving') : t('budgets.save_budget')}
        </button>
      </div>
    </div>
  );
}
