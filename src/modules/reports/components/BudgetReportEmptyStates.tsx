import { BarChart3, WalletCards } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';

interface Props {
  hasBudget: boolean;
  hasSpending: boolean;
  onConfigureBudget: () => void;
}

export function BudgetReportEmptyStates({ hasBudget, hasSpending, onConfigureBudget }: Props) {
  const { t } = useLanguage();

  return (
    <>
      {!hasBudget && (
        <div className="mb-4 flex items-start gap-3 rounded-[16px] border border-dashed border-amber-300 bg-amber-50 p-4 text-amber-900">
          <WalletCards className="mt-0.5 shrink-0" size={22} />
          <div>
            <h2 className="font-bold">{t('budget_report.no_budget_title')}</h2>
            <p className="mt-1 text-sm">{t('budget_report.no_budget_message')}</p>
            <button type="button" onClick={onConfigureBudget} className="mt-3 text-sm font-bold underline">
              {t('budget_report.configure_budget')}
            </button>
          </div>
        </div>
      )}

      {!hasSpending && (
        <div className="mb-4 flex items-start gap-3 rounded-[16px] border border-dashed border-border bg-surface p-4 text-muted">
          <BarChart3 className="mt-0.5 shrink-0" size={22} />
          <div>
            <h2 className="font-bold text-text">{t('budget_report.no_spending_title')}</h2>
            <p className="mt-1 text-sm">{t('budget_report.no_spending_message')}</p>
          </div>
        </div>
      )}
    </>
  );
}
