import { describe, expect, it } from 'vitest';
import { mapToLoan } from './loan.mapper';
import {
  loanDateToLocalTimestamp,
  normalizeLoanDate,
  timestampToLoanDate,
} from './loan-date';

describe('loan calendar dates', () => {
  it('preserves the calendar day from legacy datetime values without UTC conversion', () => {
    expect(normalizeLoanDate('2026-01-02T23:45:00.000Z')).toBe('2026-01-02');
    expect(normalizeLoanDate('2026-01-02 05:30:00')).toBe('2026-01-02');
  });

  it('round-trips a date through local midnight without shifting the selected day', () => {
    const timestamp = loanDateToLocalTimestamp('2026-08-09');

    expect(timestamp).not.toBeNull();
    expect(timestampToLoanDate(timestamp as number)).toBe('2026-08-09');
  });

  it('maps legacy database datetimes to date-only domain values', () => {
    const mapped = mapToLoan([
      'loan-1',
      null,
      'borrow',
      'Alice',
      null,
      1_000,
      '2026-08-09T23:59:00.000Z',
      null,
      'active',
      1,
      1,
      null,
      1,
      null,
      '2026-07-01 08:30:00',
      null,
    ]);

    expect(mapped.loan_date).toBe('2026-07-01');
    expect(mapped.due_date).toBe('2026-08-09');
  });

  it('rejects impossible calendar dates', () => {
    expect(normalizeLoanDate('2026-02-30')).toBeNull();
    expect(normalizeLoanDate('not-a-date')).toBeNull();
  });
});
