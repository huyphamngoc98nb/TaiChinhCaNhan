import { CategoryBudget, BudgetProgress } from '../domain/budget.model';
import { BudgetCategoryItem } from './BudgetCategoryItem';
import { EmptyBudgetPrompt } from './EmptyBudgetPrompt';

interface Props {
  categories: CategoryBudget[];
  allProgress: BudgetProgress[];
  onItemClick: (category: CategoryBudget) => void;
}

export function BudgetCategoryList({ categories, allProgress, onItemClick }: Props) {
  const budgetsSetCount = categories.filter(c => c.budget_amount !== null).length;
  const anyBudgetSet = budgetsSetCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[16px] font-semibold text-gray-900">Categories</h3>
        <p className="text-[12px] text-gray-500 uppercase">
          {budgetsSetCount} / {categories.length} budgets set
        </p>
      </div>

      {!anyBudgetSet && <EmptyBudgetPrompt />}

      <div className="space-y-3">
        {categories.map(category => {
          const progress = allProgress.find(p => p.budget.category_id === category.category_id);
          return (
            <BudgetCategoryItem 
              key={category.category_id}
              category={category} 
              progress={progress}
              onClick={() => onItemClick(category)}
            />
          );
        })}
      </div>
    </div>
  );
}
