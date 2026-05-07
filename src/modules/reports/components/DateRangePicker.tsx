import React from 'react';
import { DateRangePreset } from '../services/build-date-range';
import { ReportGranularity } from '../domain/report.model';

interface Props {
  preset: DateRangePreset;
  granularity: ReportGranularity;
  onPresetChange: (preset: DateRangePreset) => void;
  onGranularityChange: (g: ReportGranularity) => void;
}

export const DateRangePicker: React.FC<Props> = ({ preset, granularity, onPresetChange, onGranularityChange }) => {
  return (
    <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 mb-6 bg-white p-4 rounded-lg shadow border border-gray-100">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
        <select 
          value={preset} 
          onChange={(e) => onPresetChange(e.target.value as DateRangePreset)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        >
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="last_30_days">Last 30 Days</option>
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
        <select 
          value={granularity} 
          onChange={(e) => onGranularityChange(e.target.value as ReportGranularity)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </div>
    </div>
  );
};
