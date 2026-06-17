import { useMemo } from 'react';
import { Plus, Target } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { AccountType, BudgetProgress, CategoryBudget, resolveBudgetScope } from '../domain/budget.model';
import { BudgetCategoryItem } from './BudgetCategoryItem';
import { sortBudgetProgressByAttention } from '@/modules/reports/services/financial-calculations';

type EditableCategoryBudget = CategoryBudget & {
  budget_account_type_scope?: AccountType | null;
};

interface Props {
  allProgress: BudgetProgress[];
  onItemClick: (category: EditableCategoryBudget) => void;
  onViewTransactions?: (progress: BudgetProgress) => void;
  onCreateBudget?: () => void;
}

export function BudgetCategoryList({ allProgress, onItemClick, onViewTransactions, onCreateBudget }: Props) {
  const { t } = useLanguage();

  const activeBudgetProgresses = useMemo(
    () => sortBudgetProgressByAttention(allProgress),
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
              onViewTransactions={onViewTransactions ? () => onViewTransactions(progress) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-[14px] border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
            <Target size={27} />
          </div>
          <h4 className="text-[17px] font-bold text-gray-900">{t('budgets.no_budgets_configured')}</h4>
          <p className="mt-2 max-w-[300px] text-[13px] leading-5 text-gray-500">
            {t('budgets.no_budgets_hint')}
          </p>
          <button
            type="button"
            onClick={onCreateBudget}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-[12px] bg-indigo-500 px-5 text-[14px] font-semibold text-white shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            <Plus size={17} />
            {t('budgets.set_a_budget')}
          </button>
        </div>
      )}
    </div>
  );
}
