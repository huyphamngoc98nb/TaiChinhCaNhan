/**
 * Domain models for recurring bills.
 *
 * REMINDER RULES (deterministic):
 * - DueStatus is computed purely from `next_due_date` vs `now` at check time.
 * - 'overdue'  : next_due_date < today (bill passed due without being handled)
 * - 'due_today': next_due_date falls on today
 * - 'upcoming' : today + reminder_days >= next_due_date > today
 * - No reminder is shown if the bill is inactive.
 *
 * Transaction creation:
 * - MVP: reminders are NOTIFICATION ONLY. No automatic transaction is created.
 * - The user must manually add a transaction when they pay the bill.
 */

export type DueStatus = 'upcoming' | 'due_today' | 'overdue';

export interface RecurringBill {
  id: string;
  wallet_id: string;
  category_id: string;
  /** Bill title / description shown to user */
  name: string;
  amount: number;
  /** Currently only 'monthly' is used for this module; schema supports others */
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Unix timestamp (ms) of the next due date (midnight local) */
  next_due_date: number;
  /** Number of days before due date to surface reminder */
  reminder_days: number;
  /** 1 = active, 0 = inactive */
  is_active: 0 | 1;
  created_at: number;
  updated_at: number;
}

export interface RecurringBillReminder {
  bill: RecurringBill;
  status: DueStatus;
  /** Days until or since due date. Negative = overdue. */
  days_diff: number;
}

export interface CreateRecurringBillInput {
  wallet_id: string;
  category_id: string;
  name: string;
  amount: number;
  frequency: RecurringBill['frequency'];
  next_due_date: number;
  reminder_days: number;
}

export interface UpdateRecurringBillInput {
  wallet_id?: string;
  category_id?: string;
  name?: string;
  amount?: number;
  frequency?: RecurringBill['frequency'];
  next_due_date?: number;
  reminder_days?: number;
  is_active?: 0 | 1;
}
