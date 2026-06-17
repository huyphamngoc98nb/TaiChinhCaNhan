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
import { useCurrency } from '@/shared/context/CurrencyContext';
import { getAppLocale } from '@/shared/utils/locale';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { Pencil } from 'lucide-react';

interface Props {
  category: CategoryBudget;
  progress?: BudgetProgress;
  onClick: () => void;
  onViewTransactions?: () => void;
}

export function BudgetCategoryItem({ category, progress, onClick, onViewTransactions }: Props) {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const locale = getAppLocale(language);
  const isSet = category.budget_amount !== null;
  const displayAmount = (amount: number) => showAmounts ? formatAmount(amount, locale) : HIDDEN_AMOUNT;
  const hasOffset = (progress?.total_offset ?? 0) > 0;

  const periodLabel = isSet
    ? category.budget_period === 'monthly'
      ? t('budgets.monthly_budget')
      : t('budgets.weekly_budget')
    : t('budgets.no_limit_set');

  // Resolve scope từ progress.budget nếu có (đã có account_type_scope)
  const scope = progress ? resolveBudgetScope(progress.budget) : null;

  return (
    <div
      className="bg-surface rounded-xl border border-border p-4 mb-2 cursor-pointer"
      style={{ boxShadow: '0 1px 4px var(--shadow-color)' }}
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
          <div className={`grid w-full gap-2 ${hasOffset ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-3'}`}>
            <div className="flex-1 text-left">
              <p className="text-[12px] text-gray-500">
                {hasOffset ? t('budgets.gross_spent') : t('budgets.spent')}
              </p>
              <p className="text-[14px] font-semibold text-gray-900 tabular-nums">
                {displayAmount(hasOffset ? progress.total_expense ?? progress.spent_amount : progress.spent_amount)}
              </p>
            </div>
            {hasOffset && (
              <>
                <div className="flex-1 text-left">
                  <p className="text-[12px] text-gray-500">{t('budgets.offset')}</p>
                  <p className="text-[14px] font-semibold text-emerald-600 tabular-nums">
                    {displayAmount(progress.total_offset ?? 0)}
                  </p>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[12px] text-gray-500">{t('budgets.net_spent')}</p>
                  <p className="text-[14px] font-semibold text-gray-900 tabular-nums">
                    {displayAmount(progress.net_expense ?? progress.spent_amount)}
                  </p>
                </div>
              </>
            )}
            <div className="flex-1 text-left">
              <p className="text-[12px] text-gray-500">{t('budgets.budget_label')}</p>
              <p className="text-[14px] font-semibold text-gray-900 tabular-nums">
                {displayAmount(category.budget_amount ?? 0)}
              </p>
            </div>
            <div className="flex-1 text-left">
              {progress.status === 'exceeded' ? (
                <>
                  <p className="text-[12px] text-gray-500">{t('budgets.over')}</p>
                  <p className="text-[14px] font-semibold text-red-500 tabular-nums">
                    {displayAmount(Math.abs(progress.remaining_amount))}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[12px] text-gray-500">{t('budgets.left')}</p>
                  <p className="text-[14px] font-semibold text-green-500 tabular-nums">
                    {displayAmount(progress.remaining_amount)}
                  </p>
                </>
              )}
            </div>
          </div>
          <ProgressBar
            percentage={progress.percentage * 100}
            status={progress.status === 'exceeded' ? 'danger' : progress.status}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="font-semibold text-gray-500">
              {Math.round(progress.percentage * 100)}{t('budgets.used_pct')}
            </span>
            {progress.is_projected_exceeded && (
              <span className="rounded-full bg-red-50 px-2 py-1 font-semibold text-red-600">
                {t('budgets.projected_exceeded_end_period')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Row 4 */}
      <div className="mt-2">
        {!isSet ? (
          <span className="text-[13px] text-gray-500 h-11 flex items-center">
            {t('budgets.no_limit_set')}
          </span>
        ) : (
          <div className="flex items-center justify-between gap-3">
            {onViewTransactions && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onViewTransactions();
                }}
                className="h-11 rounded-[10px] bg-gray-50 px-3 text-[13px] font-semibold text-gray-600 active:bg-gray-100"
              >
                {t('budgets.view_transactions')}
              </button>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClick();
              }}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-500 active:bg-gray-100"
              aria-label={`${t('common.edit')} ${category.category_name}`}
            >
              <Pencil size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
