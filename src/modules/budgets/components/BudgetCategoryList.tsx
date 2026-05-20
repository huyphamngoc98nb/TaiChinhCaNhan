import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { AccountType, BudgetProgress, CategoryBudget, resolveBudgetScope } from '../domain/budget.model';
import { BudgetCategoryItem } from './BudgetCategoryItem';
import { EmptyBudgetPrompt } from './EmptyBudgetPrompt';
import { CategoryIcon } from '@/modules/categories/components/CategoryIcon';

type EditableCategoryBudget = CategoryBudget & {
  budget_account_type_scope?: AccountType | null;
};

interface Props {
  categories: CategoryBudget[];
  allProgress: BudgetProgress[];
  onItemClick: (category: EditableCategoryBudget) => void;
}

const SCOPE_ORDER = { global: 0, account_type: 1, wallet: 2 };

export function BudgetCategoryList({ categories, allProgress, onItemClick }: Props) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const progressByCategory = useMemo(() => {
    const map = new Map<string, BudgetProgress[]>();

    for (const progress of allProgress) {
      const existing = map.get(progress.budget.category_id) ?? [];
      existing.push(progress);
      map.set(progress.budget.category_id, existing);
    }

    return map;
  }, [allProgress]);

  const budgetsSetCount = categories.filter(category =>
    category.budget_amount !== null ||
    (progressByCategory.get(category.category_id)?.length ?? 0) > 0
  ).length;

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;

    return categories.filter(category =>
      category.category_name.toLowerCase().includes(normalizedQuery) ||
      (category.icon ?? '').toLowerCase().includes(normalizedQuery)
    );
  }, [categories, normalizedQuery]);

  const selectedCategory = useMemo(
    () => categories.find(category => category.category_id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const selectedProgresses = useMemo(() => {
    if (!selectedCategory) return [];

    return [...(progressByCategory.get(selectedCategory.category_id) ?? [])].sort((a, b) =>
      SCOPE_ORDER[resolveBudgetScope(a.budget).type] - SCOPE_ORDER[resolveBudgetScope(b.budget).type]
    );
  }, [progressByCategory, selectedCategory]);

  const activeBudgetProgresses = useMemo(
    () => [...allProgress].sort((a, b) => a.budget.category_name.localeCompare(b.budget.category_name)),
    [allProgress]
  );

  function toEditableCategory(progress: BudgetProgress): EditableCategoryBudget {
    const scope = resolveBudgetScope(progress.budget);
    const category = categories.find(item => item.category_id === progress.budget.category_id);

    return {
      category_id: progress.budget.category_id,
      category_name: progress.budget.category_name,
      type: progress.budget.category_type,
      icon: progress.budget.icon ?? category?.icon,
      color: progress.budget.color ?? category?.color,
      budget_amount: progress.budget.amount,
      budget_period: progress.budget.period,
      budget_account_type_scope: scope.type === 'account_type' ? scope.accountType : null,
    };
  }

  function describeBudget(category: CategoryBudget) {
    if (category.budget_amount === null) {
      const progresses = progressByCategory.get(category.category_id) ?? [];
      if (progresses.length === 1) {
        const progress = progresses[0];
        const periodLabel = progress.budget.period === 'monthly'
          ? t('budgets.monthly')
          : t('budgets.weekly');
        return `${progress.budget.amount.toLocaleString('vi-VN')} - ${periodLabel}`;
      }
      if (progresses.length > 1) {
        return `${progresses.length} ${t('budgets.budgets_set')}`;
      }
      return t('budgets.no_limit_set');
    }

    const periodLabel = category.budget_period === 'monthly'
      ? t('budgets.monthly')
      : t('budgets.weekly');

    return `${category.budget_amount.toLocaleString('vi-VN')} - ${periodLabel}`;
  }

  function handleSelect(category: CategoryBudget) {
    setSelectedCategoryId(category.category_id);
    setQuery('');
    setIsPickerOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-gray-900">{t('budgets.categories')}</h3>
        <p className="text-[12px] uppercase text-gray-500">
          {budgetsSetCount} / {categories.length} {t('budgets.budgets_set')}
        </p>
      </div>

      {budgetsSetCount === 0 && <EmptyBudgetPrompt />}

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

      {selectedCategory ? (
        selectedProgresses.length > 0 ? (
          <div className="space-y-2">
            {selectedProgresses.map((progress) => (
              <BudgetCategoryItem
                key={progress.budget.id}
                category={toEditableCategory(progress)}
                progress={progress}
                onClick={() => onItemClick(toEditableCategory(progress))}
              />
            ))}
          </div>
        ) : (
          <BudgetCategoryItem
            category={selectedCategory}
            onClick={() => onItemClick(selectedCategory)}
          />
        )
      ) : activeBudgetProgresses.length > 0 ? (
        <div className="space-y-2">
          {activeBudgetProgresses.map((progress) => (
            <BudgetCategoryItem
              key={progress.budget.id}
              category={toEditableCategory(progress)}
              progress={progress}
              onClick={() => onItemClick(toEditableCategory(progress))}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-dashed border-gray-300 bg-white px-4 py-5 text-center text-[13px] text-gray-500">
          {t('budgets.no_budgets_configured')}
        </div>
      )}
    </div>
  );
}
