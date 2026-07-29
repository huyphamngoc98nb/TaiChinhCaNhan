import React from 'react';
import { DateRangePreset } from '../services/build-date-range';
import { DateRange, ReportGranularity } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { RotateCcw } from 'lucide-react';

interface Props {
  preset: DateRangePreset;
  granularity: ReportGranularity;
  customRange: DateRange;
  onPresetChange: (preset: DateRangePreset) => void;
  onGranularityChange: (g: ReportGranularity) => void;
  onCustomRangeChange: (range: DateRange) => void;
  onReset: () => void;
  disabled?: boolean;
}

const dateInputValue = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

const startOfInputDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return date.getTime();
};

const endOfInputDate = (value: string) => {
  const date = new Date(`${value}T23:59:59.999`);
  return date.getTime();
};

export const DateRangePicker: React.FC<Props> = ({
  preset,
  granularity,
  customRange,
  onPresetChange,
  onGranularityChange,
  onCustomRangeChange,
  onReset,
  disabled = false,
}) => {
  const { t } = useLanguage();
  const isDefault = preset === 'this_month' && granularity === 'day';
  const focusRingClasses =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring-offset)]';
  const presetOptions: Array<{ value: DateRangePreset; label: string }> = [
    { value: 'this_week', label: t('reports.period_this_week') },
    { value: 'this_month', label: t('reports.period_this_month') },
    { value: 'last_month', label: t('reports.period_last_month') },
    { value: 'this_quarter', label: t('reports.period_this_quarter') },
    { value: 'custom', label: t('reports.period_custom') },
  ];
  const granularityOptions: Array<{ value: ReportGranularity; label: string }> = [
    { value: 'day', label: t('reports.granularity_day') },
    { value: 'week', label: t('reports.granularity_week') },
    { value: 'month', label: t('reports.granularity_month') },
  ];

  return (
    <section
      className="mb-5 rounded-2xl border border-border bg-surface p-4"
      aria-labelledby="report-period-heading"
      aria-busy={disabled}
    >
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id="report-period-heading" className="text-base font-bold leading-5 text-text">
          {t('reports.period_label')}
        </h2>
        {!isDefault && (
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-3 text-sm font-semibold text-muted transition-colors active:bg-surface-muted disabled:cursor-not-allowed disabled:text-subtle ${focusRingClasses}`}
          >
            <RotateCcw size={16} aria-hidden="true" />
            {t('reports.reset_filters')}
          </button>
        )}
      </div>

      <label htmlFor="report-period-preset" className="mt-3 block text-sm font-semibold text-muted">
        {t('reports.current_period')}
      </label>
      <select
        id="report-period-preset"
        aria-label={t('reports.period_label')}
        value={preset}
        disabled={disabled}
        onChange={event => onPresetChange(event.target.value as DateRangePreset)}
        className={`mt-2 min-h-12 w-full rounded-xl border border-[var(--border-strong)] bg-bg-subtle px-3 text-sm font-semibold text-text disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle ${focusRingClasses}`}
      >
        {presetOptions.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      {preset === 'custom' && (
        <div className="mt-3 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
          <label className="min-w-0 text-sm font-semibold text-muted">
            <span className="mb-2 block">{t('reports.custom_start')}</span>
            <input
              type="date"
              value={dateInputValue(customRange.startDate)}
              disabled={disabled}
              onChange={event => onCustomRangeChange({ ...customRange, startDate: startOfInputDate(event.target.value) })}
              className={`min-h-12 w-full min-w-0 rounded-xl border border-[var(--border-strong)] bg-bg-subtle px-3 text-sm font-semibold text-text disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle ${focusRingClasses}`}
            />
          </label>
          <label className="min-w-0 text-sm font-semibold text-muted">
            <span className="mb-2 block">{t('reports.custom_end')}</span>
            <input
              type="date"
              value={dateInputValue(customRange.endDate)}
              disabled={disabled}
              onChange={event => onCustomRangeChange({ ...customRange, endDate: endOfInputDate(event.target.value) })}
              className={`min-h-12 w-full min-w-0 rounded-xl border border-[var(--border-strong)] bg-bg-subtle px-3 text-sm font-semibold text-text disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle ${focusRingClasses}`}
            />
          </label>
        </div>
      )}

      <fieldset className="mt-4 min-w-0">
        <legend className="text-sm font-semibold text-muted">{t('reports.granularity_label')}</legend>
        <div
          className="mt-2 grid min-w-0 grid-cols-3 gap-1 rounded-xl border border-border bg-surface-muted p-1"
        >
          {granularityOptions.map(option => (
            <button
              key={option.value}
              type="button"
              aria-pressed={granularity === option.value}
              disabled={disabled}
              onClick={() => onGranularityChange(option.value)}
              className={`min-h-11 min-w-0 whitespace-nowrap rounded-[10px] border px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:text-subtle ${focusRingClasses} ${
                granularity === option.value
                  ? 'border-[var(--selected-border)] bg-surface text-[var(--selected-text)]'
                  : 'border-transparent text-muted active:bg-surface'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
};
