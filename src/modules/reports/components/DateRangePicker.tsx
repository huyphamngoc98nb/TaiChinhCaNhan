import React from 'react';
import { DateRangePreset } from '../services/build-date-range';
import { ReportGranularity } from '../domain/report.model';
import { useLanguage } from '@/shared/context/LanguageContext';

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
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.period_label')}</label>
        <select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value as DateRangePreset)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        >
          <option value="this_week">{t('reports.period_this_week')}</option>
          <option value="this_month">{t('reports.period_this_month')}</option>
          <option value="last_month">{t('reports.period_last_month')}</option>
          <option value="last_30_days">{t('reports.period_last_30_days')}</option>
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.granularity_label')}</label>
        <select
          value={granularity}
          onChange={(e) => onGranularityChange(e.target.value as ReportGranularity)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        >
          <option value="day">{t('reports.granularity_day')}</option>
          <option value="week">{t('reports.granularity_week')}</option>
          <option value="month">{t('reports.granularity_month')}</option>
        </select>
      </div>
    </div>
  );
};
