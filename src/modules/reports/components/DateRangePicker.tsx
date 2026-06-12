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
}) => {
  const { t } = useLanguage();
  const isDefault = preset === 'this_month' && granularity === 'day';
  const presetOptions: Array<{ value: DateRangePreset; label: string }> = [
    { value: 'this_week', label: t('reports.period_this_week') },
    { value: 'this_month', label: t('reports.period_this_month') },
    { value: 'this_quarter', label: t('reports.period_this_quarter') },
    { value: 'custom', label: t('reports.period_custom') },
  ];
  const granularityOptions: Array<{ value: ReportGranularity; label: string }> = [
    { value: 'day', label: t('reports.granularity_day') },
    { value: 'week', label: t('reports.granularity_week') },
    { value: 'month', label: t('reports.granularity_month') },
  ];

  return (
    <div className="mb-4 rounded-[14px] border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase text-gray-400">{t('reports.period_label')}</div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('reports.period_label')}>
              {presetOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onPresetChange(option.value)}
                  className={`min-h-[36px] rounded-full border px-3 text-[13px] font-semibold transition-colors ${
                    preset === option.value
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 active:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                aria-label={t('reports.custom_start')}
                value={dateInputValue(customRange.startDate)}
                onChange={event => onCustomRangeChange({ ...customRange, startDate: startOfInputDate(event.target.value) })}
                className="h-[38px] min-w-0 rounded-[10px] border border-gray-200 bg-gray-50 px-2 text-[13px] font-semibold text-gray-700 outline-none focus:border-gray-400"
              />
              <input
                type="date"
                aria-label={t('reports.custom_end')}
                value={dateInputValue(customRange.endDate)}
                onChange={event => onCustomRangeChange({ ...customRange, endDate: endOfInputDate(event.target.value) })}
                className="h-[38px] min-w-0 rounded-[10px] border border-gray-200 bg-gray-50 px-2 text-[13px] font-semibold text-gray-700 outline-none focus:border-gray-400"
              />
            </div>
          )}

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase text-gray-400">{t('reports.granularity_label')}</div>
            <div className="inline-grid grid-cols-3 rounded-[12px] bg-gray-100 p-1" role="group" aria-label={t('reports.granularity_label')}>
              {granularityOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onGranularityChange(option.value)}
                  className={`h-[34px] rounded-[9px] px-3 text-[13px] font-semibold transition-colors ${
                    granularity === option.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 active:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={isDefault}
          aria-hidden={isDefault}
          aria-label={t('reports.reset_filters')}
          title={t('reports.reset_filters')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 ${
            isDefault ? 'invisible pointer-events-none' : ''
          }`}
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};
