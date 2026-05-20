import React from 'react';
import { DateRangePreset } from '../services/build-date-range';
import { ReportGranularity } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { DropdownList } from '@/shared/components/DropdownList';
import { BarChart3, CalendarRange } from 'lucide-react';

interface Props {
  preset: DateRangePreset;
  granularity: ReportGranularity;
  onPresetChange: (preset: DateRangePreset) => void;
  onGranularityChange: (g: ReportGranularity) => void;
}

export const DateRangePicker: React.FC<Props> = ({ preset, granularity, onPresetChange, onGranularityChange }) => {
  const { t } = useLanguage();

  return (
    <div className="mb-5 grid grid-cols-2 gap-2 rounded-[14px] border border-gray-100 bg-white p-2 shadow-sm">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase text-gray-400">
          <CalendarRange size={13} />
          <span className="truncate">{t('reports.period_label')}</span>
        </div>
        <DropdownList
          value={preset}
          onChange={onPresetChange}
          ariaLabel={t('reports.period_label')}
          buttonClassName="min-h-0 h-[42px] rounded-[10px] bg-gray-50 px-3 text-[13px] shadow-none"
          menuClassName="rounded-[12px]"
          optionClassName="min-h-[38px] text-[13px]"
          options={[
            { value: 'this_week', label: t('reports.period_this_week') },
            { value: 'this_month', label: t('reports.period_this_month') },
            { value: 'last_month', label: t('reports.period_last_month') },
            { value: 'last_30_days', label: t('reports.period_last_30_days') },
          ]}
        />
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase text-gray-400">
          <BarChart3 size={13} />
          <span className="truncate">{t('reports.granularity_label')}</span>
        </div>
        <DropdownList
          value={granularity}
          onChange={onGranularityChange}
          ariaLabel={t('reports.granularity_label')}
          buttonClassName="min-h-0 h-[42px] rounded-[10px] bg-gray-50 px-3 text-[13px] shadow-none"
          menuClassName="rounded-[12px]"
          optionClassName="min-h-[38px] text-[13px]"
          options={[
            { value: 'day', label: t('reports.granularity_day') },
            { value: 'week', label: t('reports.granularity_week') },
            { value: 'month', label: t('reports.granularity_month') },
          ]}
        />
      </div>
    </div>
  );
};
