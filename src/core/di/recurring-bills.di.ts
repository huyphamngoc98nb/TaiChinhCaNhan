import { SQLiteRecurringBillRepository } from '@/modules/recurring-bills/repositories/sqlite-recurring-bill.repository';
import { GetDueRemindersUseCase } from '@/modules/recurring-bills/services/get-due-reminders';

export const recurringBillRepository = new SQLiteRecurringBillRepository();
export const getDueRemindersUseCase = new GetDueRemindersUseCase(recurringBillRepository);
