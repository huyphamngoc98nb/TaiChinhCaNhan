import { IRecurringBillRepository } from '../repositories/recurring-bill.repository';
import { RecurringBillReminder } from '../domain/recurring-bill.model';
import { classifyDueStatus, daysDiff } from './classify-due-status';

/**
 * Use case: fetch all reminders that should be shown to the user.
 *
 * Only active bills within their reminder window are returned.
 * Inactive bills are silently excluded.
 *
 * NOTE (MVP): This use case is notification-only.
 * It does NOT create transactions. The user must manually record a payment.
 */
export class GetDueRemindersUseCase {
  constructor(private readonly repo: IRecurringBillRepository) {}

  async execute(nowMs: number = Date.now()): Promise<RecurringBillReminder[]> {
    const candidates = await this.repo.listDueReminders(nowMs);

    const reminders: RecurringBillReminder[] = [];

    for (const bill of candidates) {
      const status = classifyDueStatus(bill.next_due_date, bill.reminder_days, nowMs);
      if (!status) continue; // safety guard – shouldn't happen given SQL filter

      reminders.push({
        bill,
        status,
        days_diff: daysDiff(bill.next_due_date, nowMs),
      });
    }

    // Sort: overdue first, then due_today, then upcoming
    const order: Record<string, number> = { overdue: 0, due_today: 1, upcoming: 2 };
    reminders.sort((a, b) => order[a.status] - order[b.status]);

    return reminders;
  }
}
