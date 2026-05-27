import { useMemo } from 'react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { AccountType, BudgetProgress, CategoryBudget, resolveBudgetScope } from '../domain/budget.model';
import { BudgetCategoryItem } from './BudgetCategoryItem';

type EditableCategoryBudget = CategoryBudget & {
  budget_account_type_scope?: AccountType | null;
};

interface Props {
  allProgress: BudgetProgress[];
  onItemClick: (category: EditableCategoryBudget) => void;
}

export function BudgetCategoryList({ allProgress, onItemClick }: Props) {
  const { t } = useLanguage();

  const activeBudgetProgresses = useMemo(
    () => [...allProgress].sort((a, b) => a.budget.category_name.localeCompare(b.budget.category_name)),
    [allProgress]
  );

  const budgetedCategoryCount = useMemo(
    () => new Set(activeBudgetProgresses.map(progress => progress.budget.category_id)).size,
    [activeBudgetProgresses]
  );

  function toEditableCategory(progress: BudgetProgress): EditableCategoryBudget {
    const scope = resolveBudgetScope(progress.budget);

    return {
      category_id: progress.budget.category_id,
      category_name: progress.budget.category_name,
      type: progress.budget.category_type,
      icon: progress.budget.icon,
      color: progress.budget.color,
      budget_amount: progress.budget.amount,
      budget_period: progress.budget.period,
      budget_account_type_scope: scope.type === 'account_type' ? scope.accountType : null,
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-gray-900">{t('budgets.categories')}</h3>
        <p className="text-[12px] uppercase text-gray-500">
          {budgetedCategoryCount} / {budgetedCategoryCount} {t('budgets.budgets_set')}
        </p>
      </div>

      {activeBudgetProgresses.length > 0 ? (
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
