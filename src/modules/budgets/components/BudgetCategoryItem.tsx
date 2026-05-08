import { CategoryBudget, BudgetProgress } from '../domain/budget.model';
import { BudgetStatusBadge } from './BudgetStatusBadge';
import { ProgressBar } from '@/shared/components/ProgressBar/ProgressBar';

interface Props {
  category: CategoryBudget;
  progress?: BudgetProgress;
  onClick: () => void;
}

export function BudgetCategoryItem({ category, progress, onClick }: Props) {
  const isSet = category.budget_amount !== null;

  // Render emoji if icon is an emoji, otherwise render first letter of category name
  const displayIcon = category.icon && !/^[a-zA-Z0-9-_]+$/.test(category.icon) 
    ? category.icon 
    : category.category_name.charAt(0).toUpperCase();

  return (
    <div 
      className="bg-white rounded-xl p-4 mb-2 cursor-pointer"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}
      onClick={onClick}
    >
      {/* Row 1 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
            style={{ 
              backgroundColor: category.color ? `${category.color}26` : 'rgba(99,102,241,0.15)', 
              color: category.color || '#6366F1',
              fontSize: '14px'
            }}
          >
            {displayIcon}
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-gray-900 leading-tight">{category.category_name}</h4>
            <p className="text-[12px] text-gray-500">
              {isSet ? (category.budget_period === 'monthly' ? 'Monthly budget' : 'Weekly budget') : 'No limit set'}
            </p>
          </div>
        </div>
        <BudgetStatusBadge status={progress?.status} />
      </div>

      {/* Row 2 & 3 */}
      {isSet && progress && (
        <div className="mt-2 space-y-2">
          <div className="flex w-full">
            <div className="flex-1 text-left">
              <p className="text-[12px] text-gray-500">Spent</p>
              <p className="text-[14px] font-semibold text-gray-900 tabular-nums">
                ₫{progress.spent_amount.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[12px] text-gray-500">Budget</p>
              <p className="text-[14px] font-semibold text-gray-900 tabular-nums">
                ₫{category.budget_amount?.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 text-left">
              {progress.status === 'exceeded' ? (
                <>
                  <p className="text-[12px] text-gray-500">Over</p>
                  <p className="text-[14px] font-semibold text-red-500 tabular-nums">
                    ₫{Math.abs(progress.remaining_amount).toLocaleString()}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[12px] text-gray-500">Left</p>
                  <p className="text-[14px] font-semibold text-green-500 tabular-nums">
                    ₫{progress.remaining_amount.toLocaleString()}
                  </p>
                </>
              )}
            </div>
          </div>
          <ProgressBar 
            percentage={progress.percentage * 100} 
            status={progress.status === 'exceeded' ? 'danger' : progress.status}
          />
        </div>
      )}

      {/* Row 4 */}
      <div className="mt-2">
        {!isSet ? (
          <button 
            className="w-full flex items-center justify-center rounded-lg bg-transparent"
            style={{ height: '36px', border: '1px dashed rgba(99,102,241,0.4)', color: '#6366F1', fontSize: '13px' }}
          >
            + Set budget
          </button>
        ) : (
          <div className="flex justify-end">
            <span className="text-[13px] text-gray-500 h-11 flex items-center">Edit</span>
          </div>
        )}
      </div>
    </div>
  );
}
