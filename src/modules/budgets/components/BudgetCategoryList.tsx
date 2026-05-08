import { useLanguage } from '@/shared/context/LanguageContext';
import { BudgetWithCategory, BudgetProgress } from '../domain/budget.model';
import { BudgetCategoryItem } from './BudgetCategoryItem';
import { EmptyBudgetPrompt } from './EmptyBudgetPrompt';

interface Props {
  budgets: BudgetWithCategory[];
  allProgress: BudgetProgress[];
  onItemClick: (budget: BudgetWithCategory) => void;
}

export function BudgetCategoryList({ budgets, allProgress, onItemClick }: Props) {
  const { t } = useLanguage();

  if (budgets.length === 0) {
    return <EmptyBudgetPrompt />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[16px] font-semibold text-gray-900">{t('budgets.categories')}</h3>
        <p className="text-[12px] text-gray-500 uppercase">
          {budgets.length} {t('budgets.budgets_set')}
        </p>
      </div>

      <div className="space-y-3">
        {budgets.map(budget => {
          const progress = allProgress.find(
            p => p.budget.category_id === budget.category_id && p.budget.period === budget.period
          );
          return (
            <BudgetCategoryItem
              key={budget.id}
              budget={budget}
              progress={progress}
              onClick={() => onItemClick(budget)}
            />
          );
        })}
      </div>
    </div>
  );
}
