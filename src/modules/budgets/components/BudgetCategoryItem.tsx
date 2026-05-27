import { useLanguage } from '@/shared/context/LanguageContext';
import {
  CategoryBudget,
  BudgetProgress,
  resolveBudgetScope,
} from '../domain/budget.model';
import { BudgetStatusBadge } from './BudgetStatusBadge';
import { BudgetScopeBadge } from './BudgetScopeBadge';
import { ProgressBar } from '@/shared/components/ProgressBar/ProgressBar';
import { CategoryIcon } from '@/modules/categories/components/CategoryIcon';

interface Props {
  category: CategoryBudget;
  progress?: BudgetProgress;
  onClick: () => void;
}

export function BudgetCategoryItem({ category, progress, onClick }: Props) {
  const { t } = useLanguage();
  const isSet = category.budget_amount !== null;

  const periodLabel = isSet
    ? category.budget_period === 'monthly'
      ? t('budgets.monthly_budget')
      : t('budgets.weekly_budget')
    : t('budgets.no_limit_set');

  // Resolve scope từ progress.budget nếu có (đã có account_type_scope)
  const scope = progress ? resolveBudgetScope(progress.budget) : null;

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
              fontSize: '14px',
            }}
          >
            <CategoryIcon
              icon={category.icon}
              name={category.category_name}
              type={category.type}
              size={17}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-[15px] font-semibold text-gray-900 leading-tight">
                {category.category_name}
              </h4>
              {scope && <BudgetScopeBadge scope={scope} />}
            </div>
            <p className="text-[12px] text-gray-500">{periodLabel}</p>
          </div>
        </div>
        <BudgetStatusBadge status={progress?.status} />
      </div>

      {/* Row 2 & 3 */}
      {isSet && progress && (
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
                ₫{category.budget_amount?.toLocaleString()}
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

      {/* Row 4 */}
      <div className="mt-2">
        {!isSet ? (
          <button
            className="w-full flex items-center justify-center rounded-lg bg-transparent"
            aria-label={t('budgets.set_budget')}
            title={t('budgets.set_budget')}
            style={{
              height: '36px',
              border: '1px dashed rgba(99,102,241,0.4)',
              color: '#6366F1',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            +
          </button>
        ) : (
          <div className="flex justify-end">
            <span className="text-[13px] text-gray-500 h-11 flex items-center">
              {t('budgets.edit')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
