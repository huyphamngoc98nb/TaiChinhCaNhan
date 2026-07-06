import type { DateRange } from '../domain/report.model';

export function normalizeReportMonth(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

export function buildBudgetMonthRange(timestamp: number): DateRange {
  const month = new Date(normalizeReportMonth(timestamp));

  return {
    startDate: month.getTime(),
    endDate: new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    ).getTime(),
  };
}

export function shiftReportMonth(timestamp: number, offset: number): number {
  const month = new Date(normalizeReportMonth(timestamp));
  return new Date(month.getFullYear(), month.getMonth() + offset, 1).getTime();
}

export function isCurrentReportMonth(timestamp: number, now = Date.now()): boolean {
  return normalizeReportMonth(timestamp) === normalizeReportMonth(now);
}
