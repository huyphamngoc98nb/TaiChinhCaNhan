import { useLanguage } from '@/shared/context/LanguageContext';
import { BudgetWithCategory, BudgetProgress } from '../domain/budget.model';
import { BudgetStatusBadge } from './BudgetStatusBadge';
import { ProgressBar } from '@/shared/components/ProgressBar/ProgressBar';

interface Props {
  budget: BudgetWithCategory;
  progress?: BudgetProgress;
  onClick: () => void;
}

export function BudgetCategoryItem({ budget, progress, onClick }: Props) {
  const { t } = useLanguage();

  const displayIcon =
    budget.icon && !/^[a-zA-Z0-9-_]+$/.test(budget.icon)
      ? budget.icon
      : budget.category_name.charAt(0).toUpperCase();

  const periodLabel =
    budget.period === 'monthly'
      ? t('budgets.monthly_budget')
      : t('budgets.weekly_budget');

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
              backgroundColor: budget.color ? `${budget.color}26` : 'rgba(99,102,241,0.15)',
              color: budget.color || '#6366F1',
              fontSize: '14px',
            }}
          >
            {displayIcon}
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-gray-900 leading-tight">
              {budget.category_name}
            </h4>
            <p className="text-[12px] text-gray-500">{periodLabel}</p>
          </div>
        </div>
        <BudgetStatusBadge status={progress?.status} />
      </div>

      {/* Row 2 & 3: progress detail */}
      {progress && (
        <div className="mt-2 space-y-2">
          <div className="flex w-full">
            <div className="flex-1 text-left">
              <p className="text-[12px] text-gray-500">{t('budgets.spent')}</p>
              <p className="text-[14px] font-semibold text-gray-900 tabular-nums">
                ₫{progress.spent_amount.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[12px] text-gray-500">{t('budgets.budget_label')}</p>
              <p className="text-[14px] font-semibold text-gray-900 tabular-nums">
                ₫{budget.amount.toLocaleString()}
              </p>
            </div>
            <div className="flex-1 text-left">
              {progress.status === 'exceeded' ? (
                <>
                  <p className="text-[12px] text-gray-500">{t('budgets.over')}</p>
                  <p className="text-[14px] font-semibold text-red-500 tabular-nums">
                    ₫{Math.abs(progress.remaining_amount).toLocaleString()}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[12px] text-gray-500">{t('budgets.left')}</p>
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

      {/* Row 4: action */}
      <div className="mt-2">
        <div className="flex justify-end">
          <span className="text-[13px] text-gray-500 h-11 flex items-center">
            {t('budgets.edit')}
          </span>
        </div>
      </div>
    </div>
  );
}
