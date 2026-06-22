import { DateRange } from '../domain/report.model';
import {
  DEFAULT_DISPLAY_FORMAT_SETTINGS,
  type DisplayFormatSettings,
} from '@/modules/settings/services/display-format-settings.service';
import { getWeekDateRange } from '@/shared/utils/date-range';

export type DateRangePreset = 'this_week' | 'this_month' | 'this_quarter' | 'last_month' | 'last_30_days' | 'custom';

export function buildDateRange(
  preset: DateRangePreset,
  customRange?: DateRange,
  displayFormatSettings: DisplayFormatSettings = DEFAULT_DISPLAY_FORMAT_SETTINGS
): DateRange {
  const now = new Date();
  
  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate: start.getTime(), endDate: end.getTime() };
  }

  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startDate: start.getTime(), endDate: end.getTime() };
  }

  if (preset === 'this_quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterStartMonth, 1);
    const end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
    return { startDate: start.getTime(), endDate: end.getTime() };
  }
  
  if (preset === 'last_30_days') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start.getTime(), endDate: end.getTime() };
  }
  
  if (preset === 'this_week') {
    return getWeekDateRange(now, displayFormatSettings);
  }
  
  if (preset === 'custom' && customRange) {
    return customRange;
  }
  
  throw new Error('Invalid date range preset or missing custom range');
}
