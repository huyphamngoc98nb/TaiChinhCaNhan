import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';

interface Props {
  label: string;
  isCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
}

export function BudgetMonthNavigator({
  label,
  isCurrentMonth,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
}: Props) {
  const { t } = useLanguage();

  return (
    <section className="mb-4 rounded-[16px] border border-border bg-surface p-3 shadow-sm">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <button
          type="button"
          onClick={onPreviousMonth}
          aria-label={t('budget_report.previous_month')}
          className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-surface-muted text-text active:scale-95"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="min-w-0 text-center">
          <div className="text-[11px] font-semibold uppercase text-muted">
            {t('budget_report.selected_month')}
          </div>
          <div className="truncate text-base font-bold text-text">{label}</div>
        </div>

        <button
          type="button"
          onClick={onNextMonth}
          aria-label={t('budget_report.next_month')}
          className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-surface-muted text-text active:scale-95"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {!isCurrentMonth && (
        <button
          type="button"
          onClick={onCurrentMonth}
          className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-primary/30 bg-primary/10 px-3 text-sm font-bold text-primary active:scale-[0.99]"
        >
          <CalendarDays size={17} />
          {t('budget_report.current_month')}
        </button>
      )}
    </section>
  );
}
