import { appRepositories } from '@/core/repositories/app-repositories';
import { GetDueRemindersUseCase } from '@/modules/recurring-bills/services/get-due-reminders';

export const recurringBillRepository = appRepositories.recurringBill;
export const getDueRemindersUseCase = new GetDueRemindersUseCase(recurringBillRepository);
