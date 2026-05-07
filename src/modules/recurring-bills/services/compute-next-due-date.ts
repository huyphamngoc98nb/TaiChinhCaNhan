import { RecurringBill } from '../domain/recurring-bill.model';

type Frequency = RecurringBill['frequency'];

/**
 * Compute the next due date after `fromDateMs` for a given frequency.
 *
 * Edge-case rules:
 * - Monthly: adds exactly 1 month using Date arithmetic, so Feb 31 becomes Mar 3 (native JS clamping).
 *   To get end-of-month behaviour, callers should store the raw day-of-month separately if needed.
 * - Yearly: same as monthly but +1 year.
 * - Daily/Weekly: fixed ms offsets.
 *
 * @param fromDateMs  - the current due date in unix ms
 * @param frequency   - recurrence frequency
 */
export function computeNextDueDate(fromDateMs: number, frequency: Frequency): number {
  const d = new Date(fromDateMs);

  switch (frequency) {
    case 'daily':
      return fromDateMs + 86_400_000;

    case 'weekly':
      return fromDateMs + 7 * 86_400_000;

    case 'monthly': {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
      return next.getTime();
    }

    case 'yearly': {
      const next = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
      return next.getTime();
    }

    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}
