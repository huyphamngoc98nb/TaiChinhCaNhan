import {
  DEFAULT_DISPLAY_FORMAT_SETTINGS,
  type DisplayFormatSettings,
} from '@/modules/settings/services/display-format-settings.service';
import { getEndOfWeek, getStartOfWeek } from '@/shared/utils/display-format';

export interface DateRange {
  startDate: number;
  endDate: number;
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function toMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function parseMonthKey(monthKey: string): Date {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function coerceMonthDate(value: Date | string): Date {
  return typeof value === 'string' ? parseMonthKey(value) : value;
}

export function startOfMonth(value: Date | string): number {
  const date = coerceMonthDate(value);
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0).getTime();
}

export function endOfMonth(value: Date | string): number {
  const date = coerceMonthDate(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
}

export function getMonthDateRange(monthKey: string): DateRange {
  return {
    startDate: startOfMonth(monthKey),
    endDate: endOfMonth(monthKey),
  };
}

export function getWeekDateRange(
  date: Date,
  settings: DisplayFormatSettings = DEFAULT_DISPLAY_FORMAT_SETTINGS
): DateRange {
  return {
    startDate: getStartOfWeek(date, settings).getTime(),
    endDate: getEndOfWeek(date, settings).getTime(),
  };
}

export function addMonths(monthKey: string, amount: number): string {
  const date = parseMonthKey(monthKey);
  return toMonthKey(new Date(date.getFullYear(), date.getMonth() + amount, 1));
}

export function isCurrentMonth(monthKey: string, now = new Date()): boolean {
  return monthKey === toMonthKey(now);
}
