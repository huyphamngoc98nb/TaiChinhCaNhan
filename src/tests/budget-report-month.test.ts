import { describe, expect, it } from 'vitest';
import {
  buildBudgetMonthRange,
  isCurrentReportMonth,
  normalizeReportMonth,
  shiftReportMonth,
} from '@/modules/reports/services/budget-report-month';

describe('Budget report month navigation', () => {
  it('builds the complete selected calendar month', () => {
    const range = buildBudgetMonthRange(new Date(2026, 1, 12, 10, 30).getTime());

    expect(new Date(range.startDate)).toEqual(new Date(2026, 1, 1));
    expect(new Date(range.endDate)).toEqual(new Date(2026, 2, 0, 23, 59, 59, 999));
  });

  it('moves across year boundaries without retaining an invalid day', () => {
    const december = new Date(2026, 11, 31).getTime();

    expect(new Date(shiftReportMonth(december, 1))).toEqual(new Date(2027, 0, 1));
    expect(new Date(shiftReportMonth(december, -12))).toEqual(new Date(2025, 11, 1));
  });

  it('compares months independently of the day and time', () => {
    const now = new Date(2026, 6, 6, 15, 30).getTime();

    expect(normalizeReportMonth(now)).toBe(new Date(2026, 6, 1).getTime());
    expect(isCurrentReportMonth(new Date(2026, 6, 31).getTime(), now)).toBe(true);
    expect(isCurrentReportMonth(new Date(2026, 5, 30).getTime(), now)).toBe(false);
  });
});
