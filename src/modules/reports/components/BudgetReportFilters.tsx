import type { Category } from '@/modules/categories/domain/category.model';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { useLanguage } from '@/shared/context/LanguageContext';
import type { BudgetReportStatus, DateRange } from '../domain/report.model';
import type { DateRangePreset } from '../services/build-date-range';

interface Props {
  showPeriodPicker?: boolean;
  preset: DateRangePreset;
  customRange: DateRange;
  categoryId: string;
  walletId: string;
  status: '' | BudgetReportStatus;
  categories: Category[];
  wallets: Wallet[];
  onPresetChange: (value: DateRangePreset) => void;
  onCustomRangeChange: (value: DateRange) => void;
  onCategoryChange: (value: string) => void;
  onWalletChange: (value: string) => void;
  onStatusChange: (value: '' | BudgetReportStatus) => void;
}

function toInputDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function parseInputDate(value: string, endOfDay = false): number {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0).getTime();
}

export function BudgetReportFilters({
  showPeriodPicker = true,
  preset,
  customRange,
  categoryId,
  walletId,
  status,
  categories,
  wallets,
  onPresetChange,
  onCustomRangeChange,
  onCategoryChange,
  onWalletChange,
  onStatusChange,
}: Props) {
  const { t } = useLanguage();
  const periods: Array<{ value: DateRangePreset; label: string }> = [
    { value: 'today', label: t('budget_report.period_today') },
    { value: 'this_week', label: t('reports.period_this_week') },
    { value: 'this_month', label: t('reports.period_this_month') },
    { value: 'this_quarter', label: t('reports.period_this_quarter') },
    { value: 'custom', label: t('reports.period_custom') },
  ];

  return (
    <section className="mb-4 rounded-[16px] border border-border bg-surface p-4 shadow-sm">
      {showPeriodPicker && (
        <>
          <div className="mb-2 text-[11px] font-semibold uppercase text-muted">
            {t('reports.period_label')}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('reports.period_label')}>
            {periods.map((period) => (
              <button
                key={period.value}
                type="button"
                onClick={() => onPresetChange(period.value)}
                className={`min-h-9 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
                  preset === period.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface-muted text-text'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                type="date"
                aria-label={t('reports.custom_start')}
                value={toInputDate(customRange.startDate)}
                max={toInputDate(customRange.endDate)}
                onChange={(event) => onCustomRangeChange({
                  ...customRange,
                  startDate: parseInputDate(event.target.value),
                })}
                className="h-11 min-w-0 rounded-[10px] border border-border bg-surface-muted px-2 text-[13px] font-semibold text-text"
              />
              <input
                type="date"
                aria-label={t('reports.custom_end')}
                value={toInputDate(customRange.endDate)}
                min={toInputDate(customRange.startDate)}
                onChange={(event) => onCustomRangeChange({
                  ...customRange,
                  endDate: parseInputDate(event.target.value, true),
                })}
                className="h-11 min-w-0 rounded-[10px] border border-border bg-surface-muted px-2 text-[13px] font-semibold text-text"
              />
            </div>
          )}
        </>
      )}

      <div className={`${showPeriodPicker ? 'mt-4' : ''} grid grid-cols-1 gap-3 sm:grid-cols-3`}>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted">{t('budget_report.category_filter')}</span>
          <select
            aria-label={t('budget_report.category_filter')}
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="h-11 w-full rounded-[10px] border border-border bg-surface-muted px-3 text-sm font-semibold text-text"
          >
            <option value="">{t('budget_report.all_categories')}</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted">{t('budget_report.wallet_filter')}</span>
          <select
            aria-label={t('budget_report.wallet_filter')}
            value={walletId}
            onChange={(event) => onWalletChange(event.target.value)}
            className="h-11 w-full rounded-[10px] border border-border bg-surface-muted px-3 text-sm font-semibold text-text"
          >
            <option value="">{t('budget_report.all_wallets')}</option>
            {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase text-muted">{t('budget_report.status_filter')}</span>
          <select
            aria-label={t('budget_report.status_filter')}
            value={status}
            onChange={(event) => onStatusChange(event.target.value as '' | BudgetReportStatus)}
            className="h-11 w-full rounded-[10px] border border-border bg-surface-muted px-3 text-sm font-semibold text-text"
          >
            <option value="">{t('budget_report.all_statuses')}</option>
            <option value="NO_BUDGET">{t('budget_report.status_no_budget')}</option>
            <option value="IN_BUDGET">{t('budget_report.status_in_budget')}</option>
            <option value="NEAR_LIMIT">{t('budget_report.status_near_limit')}</option>
            <option value="OVER_BUDGET">{t('budget_report.status_over_budget')}</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs leading-5 text-muted">{t('budget_report.expense_only_hint')}</p>
    </section>
  );
}
