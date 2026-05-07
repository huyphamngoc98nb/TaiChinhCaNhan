import { DueStatus } from '../domain/recurring-bill.model';

/**
 * Classify the due status of a bill given its next_due_date and the current date.
 *
 * Rules (all comparisons done at day boundary — time component ignored):
 *   overdue  : dueDate < today
 *   due_today: dueDate === today
 *   upcoming : today < dueDate <= today + reminderDays
 *
 * @param nextDueDateMs  - unix ms timestamp for the bill's next due date
 * @param nowMs          - unix ms timestamp for "now" (defaults to Date.now())
 * @returns DueStatus or null if outside reminder window
 */
export function classifyDueStatus(
  nextDueDateMs: number,
  reminderDays: number,
  nowMs: number = Date.now()
): DueStatus | null {
  const startOfToday = startOfDay(nowMs);
  const dueDay = startOfDay(nextDueDateMs);

  if (dueDay < startOfToday) return 'overdue';
  if (dueDay === startOfToday) return 'due_today';

  const windowEnd = startOfToday + reminderDays * 86_400_000;
  if (dueDay <= windowEnd) return 'upcoming';

  return null; // outside reminder window
}

/** Returns midnight (00:00:00.000) of the given timestamp in local time as ms since epoch. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Returns the number of calendar days from today to the due date (negative = overdue). */
export function daysDiff(nextDueDateMs: number, nowMs: number = Date.now()): number {
  const diffMs = startOfDay(nextDueDateMs) - startOfDay(nowMs);
  return Math.round(diffMs / 86_400_000);
}
