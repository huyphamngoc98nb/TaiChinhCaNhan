import { X } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { BackButton } from '@/shared/components/BackButton';
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
}: Props) {
  const { t } = useLanguage();
  const { currency } = useCurrency();

  function handleSelect(categoryId: string) {
    const category = categories.find((item) => item.category_id === categoryId);
    if (!category) return;

    setSelectedCategory(category);
    setAmount('');
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex shrink-0 items-center justify-between gap-3 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton onClick={onClose} ariaLabel={t('common.back')} />
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-[18px] font-semibold uppercase text-indigo-500">
              {t('budgets.add_budget')}
            </p>
            {selectedCategory && (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg"
                style={{
                  backgroundColor: `${selectedCategory.color}26`,
                  color: selectedCategory.color,
                }}
              >
                <CategoryIcon
                  icon={selectedCategory.icon}
                  name={selectedCategory.category_name}
                  type={selectedCategory.type}
                  size={18}
                />
              </div>
            )}
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

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-6 pb-4">
          {/* Category Picker */}
          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-gray-700">
              {t('budgets.select_category')}
            </p>
            <DropdownList
              value={selectedCategory?.category_id ?? ''}
              onChange={handleSelect}
              ariaLabel={t('budgets.select_category')}
              placeholder={t('budgets.select_category')}
              options={[
                ...categories.map((category) => ({
                  value: category.category_id,
                  label: category.category_name,
                })),
              ]}
            />
          </div>

          {/* Period Toggle */}
          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-gray-700">{t('budgets.budget_period')}</p>
            <div className="flex h-[48px] w-full rounded-[12px] bg-gray-100 p-1">
              <button
                onClick={() => setPeriod('monthly')}
                className={`flex flex-1 items-center justify-center rounded-[9px] text-[14px] font-semibold transition-all ${
                  period === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {t('budgets.monthly')}
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={`flex flex-1 items-center justify-center rounded-[9px] text-[14px] font-semibold transition-all ${
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
          <div className="space-y-1.5" data-keyboard-scroll-target="true">
            <p className="text-[13px] font-semibold text-gray-700">{t('budgets.amount')}</p>
            <CurrencyAmountInput
              currency={currency}
              value={amount}
              onValueChange={setAmount}
              className="border-gray-200"
            />
            <p className="text-[12px] text-gray-400 ml-1 italic">
              {period === 'monthly'
                ? t('budgets.amount_hint_month')
                : t('budgets.amount_hint_week')}
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4" data-keyboard-hide-on-open="true">
            <button
              onClick={onSave}
              disabled={isSaving || !selectedCategory}
              className={`h-[54px] w-full rounded-[14px] bg-indigo-500 text-[16px] font-bold text-white
                  transition-all active:scale-[0.98] ${
                    isSaving || !selectedCategory ? 'opacity-50' : 'shadow-lg shadow-indigo-500/20'
                  }`}
            >
              {isSaving
                ? t('common.saving')
                : selectedCategory
                  ? t('budgets.save_budget')
                  : t('budgets.save_budget')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
