import { useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { AccountType, CategoryBudget, BudgetPeriod } from '../domain/budget.model';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { CategoryIcon } from '@/modules/categories/components/CategoryIcon';
import { BudgetScopePicker } from './BudgetScopePicker';
import type { BudgetScopeType } from '../hooks/useBudgetForm';

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
  const [query, setQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;

    return categories.filter(category =>
      category.category_name.toLowerCase().includes(normalizedQuery) ||
      (category.icon ?? '').toLowerCase().includes(normalizedQuery)
    );
  }, [categories, normalizedQuery]);

  function describeBudget(category: CategoryBudget) {
    if (category.budget_amount === null) return t('budgets.no_limit_set');

    const periodLabel = category.budget_period === 'monthly'
      ? t('budgets.monthly')
      : t('budgets.weekly');

    return `${category.budget_amount.toLocaleString('vi-VN')} - ${periodLabel}`;
  }

  function handleSelect(category: CategoryBudget) {
    setSelectedCategory(category);
    setAmount('');
    setQuery('');
    setIsPickerOpen(false);
  }

  return (
    <div className="flex flex-col h-full">
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
        <div className="flex-1 space-y-6">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-[12px] text-[13px] text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Category Picker */}
          <div className="space-y-1.5">
            <p className="text-[13px] font-semibold text-gray-700">{t('budgets.select_category')}</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPickerOpen(open => !open)}
                className="flex h-14 w-full items-center gap-3 rounded-[8px] border border-gray-200 bg-white px-4 text-left shadow-sm active:bg-gray-50"
              >
                <Search size={18} className="shrink-0 text-gray-400" />
                <span className={`min-w-0 flex-1 truncate text-[14px] font-medium ${
                  selectedCategory ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {selectedCategory ? selectedCategory.category_name : t('budgets.select_category')}
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-gray-400 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isPickerOpen && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-100 p-3">
                    <div className="flex h-11 items-center gap-2 rounded-[8px] bg-gray-50 px-3">
                      <Search size={17} className="shrink-0 text-gray-400" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        autoFocus
                        placeholder={t('budgets.search_placeholder')}
                        className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto py-1">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map(category => (
                        <button
                          key={category.category_id}
                          type="button"
                          onClick={() => handleSelect(category)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-gray-50"
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
                            style={{
                              backgroundColor: category.color ? `${category.color}26` : 'rgba(99,102,241,0.15)',
                              color: category.color || '#6366F1',
                            }}
                          >
                            <CategoryIcon
                              icon={category.icon}
                              name={category.category_name}
                              type={category.type}
                              size={17}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-semibold text-gray-900">
                              {category.category_name}
                            </span>
                            <span className="block text-[12px] text-gray-500">
                              {describeBudget(category)}
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-[13px] text-gray-500">
                        {t('budgets.no_matching_categories')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100">
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
