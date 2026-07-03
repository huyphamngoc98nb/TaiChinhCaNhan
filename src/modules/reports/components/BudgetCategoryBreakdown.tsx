import { BudgetStatusBadge } from '@/modules/budgets/components/BudgetStatusBadge';
import { useLanguage } from '@/shared/context/LanguageContext';
import type { BudgetReportCategory, BudgetReportStatus } from '../domain/report.model';

interface Props {
  categories: BudgetReportCategory[];
  displayAmount: (value: number) => string;
}

function badgeStatus(status: BudgetReportStatus) {
  if (status === 'NO_BUDGET') return 'not_set' as const;
  if (status === 'NEAR_LIMIT') return 'warning' as const;
  if (status === 'OVER_BUDGET') return 'exceeded' as const;
  return 'safe' as const;
}

export function BudgetCategoryBreakdown({ categories, displayAmount }: Props) {
  const { t } = useLanguage();

  if (categories.length === 0) return null;

  return (
    <section className="mb-4 space-y-3" aria-label={t('budget_report.category_breakdown')}>
      <h2 className="text-base font-bold text-text">{t('budget_report.category_breakdown')}</h2>
      {categories.map((category) => (
        <article key={category.categoryId} className="rounded-[16px] border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 flex-1 truncate font-bold text-text">{category.categoryName}</h3>
            <BudgetStatusBadge status={badgeStatus(category.status)} />
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={category.usagePercentage} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-full rounded-full ${category.status === 'OVER_BUDGET' ? 'bg-red-500' : category.status === 'NEAR_LIMIT' ? 'bg-amber-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(category.usagePercentage, 100)}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs font-bold text-muted">{category.usagePercentage.toFixed(1)}%</div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-muted">{t('budget_report.budget')}</dt><dd className="font-semibold text-text">{displayAmount(category.budgetAmount)}</dd></div>
            <div><dt className="text-xs text-muted">{t('budget_report.actual')}</dt><dd className="font-semibold text-text">{displayAmount(category.actualSpending)}</dd></div>
            <div><dt className="text-xs text-muted">{t('budget_report.remaining')}</dt><dd className="font-semibold text-text">{displayAmount(category.remainingAmount)}</dd></div>
            <div><dt className="text-xs text-muted">{t('budget_report.overspent')}</dt><dd className="font-semibold text-text">{displayAmount(category.overspentAmount)}</dd></div>
          </dl>
        </article>
      ))}
    </section>
  );
}
