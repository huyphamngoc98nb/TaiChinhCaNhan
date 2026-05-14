import React from 'react';
import { DateRangePreset } from '../services/build-date-range';
import { ReportGranularity } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';
import { DropdownList } from '@/shared/components/DropdownList';

interface Props {
  preset: DateRangePreset;
  granularity: ReportGranularity;
  onPresetChange: (preset: DateRangePreset) => void;
  onGranularityChange: (g: ReportGranularity) => void;
}

export const DateRangePicker: React.FC<Props> = ({ preset, granularity, onPresetChange, onGranularityChange }) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 mb-6 bg-white p-4 rounded-lg shadow border border-gray-100">
      <div className="flex-1">
        <p className="block text-sm font-medium text-gray-700 mb-1">{t('reports.period_label')}</p>
        <DropdownList
          value={preset}
          onChange={onPresetChange}
          ariaLabel={t('reports.period_label')}
          buttonClassName="bg-white"
          options={[
            { value: 'this_week', label: t('reports.period_this_week') },
            { value: 'this_month', label: t('reports.period_this_month') },
            { value: 'last_month', label: t('reports.period_last_month') },
            { value: 'last_30_days', label: t('reports.period_last_30_days') },
          ]}
        />
      </div>
      <div className="flex-1">
        <p className="block text-sm font-medium text-gray-700 mb-1">{t('reports.granularity_label')}</p>
        <DropdownList
          value={granularity}
          onChange={onGranularityChange}
          ariaLabel={t('reports.granularity_label')}
          buttonClassName="bg-white"
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
