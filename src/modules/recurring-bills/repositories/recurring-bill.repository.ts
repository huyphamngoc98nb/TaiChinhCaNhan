import {
  RecurringBill,
  CreateRecurringBillInput,
  UpdateRecurringBillInput,
} from '../domain/recurring-bill.model';

export interface IRecurringBillRepository {
  create(input: CreateRecurringBillInput): Promise<RecurringBill>;
  getById(id: string): Promise<RecurringBill | null>;
  listAll(): Promise<RecurringBill[]>;
  listActive(): Promise<RecurringBill[]>;
  update(id: string, input: UpdateRecurringBillInput): Promise<RecurringBill | null>;
  softDelete(id: string): Promise<void>;
  /** Returns all active bills where a reminder should be shown given currentDate */
  listDueReminders(currentDate: number): Promise<RecurringBill[]>;
}
