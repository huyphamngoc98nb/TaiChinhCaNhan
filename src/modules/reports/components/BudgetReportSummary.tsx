import { BudgetStatusBadge } from '@/modules/budgets/components/BudgetStatusBadge';
import { useLanguage } from '@/shared/context/LanguageContext';
import type { BudgetReport } from '../domain/report.model';

interface Props {
  report: BudgetReport;
  displayAmount: (value: number) => string;
}

function badgeStatus(status: BudgetReport['summary']['status']) {
  if (status === 'NO_BUDGET') return 'not_set' as const;
  if (status === 'NEAR_LIMIT') return 'warning' as const;
  if (status === 'OVER_BUDGET') return 'exceeded' as const;
  return 'safe' as const;
}

export function BudgetReportSummary({ report, displayAmount }: Props) {
  const { t } = useLanguage();
  const cards = [
    { label: t('budget_report.total_budget'), value: displayAmount(report.summary.totalBudget) },
    { label: t('budget_report.actual_spending'), value: displayAmount(report.summary.totalActualSpending) },
    { label: t('budget_report.remaining'), value: displayAmount(report.summary.remainingAmount) },
    { label: t('budget_report.overspent'), value: displayAmount(report.summary.overspentAmount) },
    { label: t('budget_report.usage'), value: `${report.summary.usagePercentage.toFixed(1)}%` },
  ];

  return (
    <section aria-label={t('budget_report.summary')} className="mb-4 rounded-[18px] bg-gray-900 p-4 text-white shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">{t('budget_report.summary')}</h2>
        <BudgetStatusBadge status={badgeStatus(report.summary.status)} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="min-w-0 rounded-[12px] bg-white/10 p-3">
            <div className="text-[11px] font-semibold uppercase leading-4 text-gray-300">{card.label}</div>
            <div className="mt-1 break-words text-base font-bold tabular-nums">{card.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
