import { X } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { AccountType, CategoryBudget, BudgetPeriod } from '../domain/budget.model';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { CategoryIcon } from '@/modules/categories/components/CategoryIcon';
import { BudgetScopePicker } from './BudgetScopePicker';
import type { BudgetScopeType } from '../hooks/useBudgetForm';
import { DropdownList } from '@/shared/components/DropdownList';

interface Props {
  categories: CategoryBudget[];
  selectedCategory: CategoryBudget | null;
  setSelectedCategory: (c: CategoryBudget) => void;
  amount: string;
  setAmount: (val: string) => void;
  period: BudgetPeriod;
  setPeriod: (val: BudgetPeriod) => void;
  scopeType: BudgetScopeType;
  setScopeType: (val: BudgetScopeType) => void;
  accountTypeScope: AccountType;
  setAccountTypeScope: (val: AccountType) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
  error: string | null;
}

export function BudgetAddSheet({
  categories,
  selectedCategory,
  setSelectedCategory,
  amount,
  setAmount,
  period,
  setPeriod,
  scopeType,
  setScopeType,
  accountTypeScope,
  setAccountTypeScope,
  onSave,
  onClose,
  isSaving,
  error,
}: Props) {
  const { t } = useLanguage();
  const { currency } = useCurrency();

  function handleSelect(categoryId: string) {
    const category = categories.find(item => item.category_id === categoryId);
    if (!category) return;

    setSelectedCategory(category);
    setAmount('');
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex min-w-0 items-center space-x-3">
            {selectedCategory && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: `${selectedCategory.color}26`, color: selectedCategory.color }}
              >
                <CategoryIcon
                  icon={selectedCategory.icon}
                  name={selectedCategory.category_name}
                  type={selectedCategory.type}
                  size={18}
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[18px] font-semibold uppercase text-indigo-500">
                {t('budgets.add_budget')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-11 h-11 flex items-center justify-center text-gray-400 bg-gray-100 rounded-full active:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Category Picker */}
          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-gray-700">{t('budgets.select_category')}</p>
            <DropdownList
              value={selectedCategory?.category_id ?? ''}
              onChange={handleSelect}
              ariaLabel={t('budgets.select_category')}
              placeholder={t('budgets.select_category')}
              options={[
                ...categories.map(category => ({
                  value: category.category_id,
                  label: category.category_name,
                })),
              ]}
            />
          </div>

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
            />
            {!error && (
              <p className="text-[12px] text-gray-400 ml-1 italic">
                {period === 'monthly'
                  ? t('budgets.amount_hint_month')
                  : t('budgets.amount_hint_week')}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 shrink-0 pt-4 border-t border-gray-100">
          <button
            onClick={onSave}
            disabled={isSaving || !selectedCategory}
            className={`w-full h-[54px] rounded-[14px] bg-indigo-500 text-white text-[16px] font-bold
              transition-all active:scale-[0.98] ${
              isSaving || !selectedCategory ? 'opacity-50' : 'shadow-lg shadow-indigo-500/20'
            }`}
          >
            {isSaving
              ? t('common.saving')
              : selectedCategory
                ? t('budgets.save_budget')
                : t('budgets.select_category')}
          </button>
        </div>
      </div>
  );
}
