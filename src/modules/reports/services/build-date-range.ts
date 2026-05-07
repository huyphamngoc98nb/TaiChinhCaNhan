import { DateRange } from '../domain/report.model';

export type DateRangePreset = 'this_week' | 'this_month' | 'last_month' | 'last_30_days' | 'custom';

export function buildDateRange(preset: DateRangePreset, customRange?: DateRange): DateRange {
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
  
  if (preset === 'last_30_days') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start.getTime(), endDate: end.getTime() };
  }
  
  if (preset === 'this_week') {
    const day = now.getDay() || 7; // Get current day number, converting Sun. to 7
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (day !== 1) {
      start.setHours(-24 * (day - 1)); // Set to Monday
    }
    start.setHours(0, 0, 0, 0); // Start of day
    
    const end = new Date(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999); // End of Sunday
    return { startDate: start.getTime(), endDate: end.getTime() };
  }
  
  if (preset === 'custom' && customRange) {
    return customRange;
  }
  
  throw new Error('Invalid date range preset or missing custom range');
}
