import { useState, useEffect, useCallback } from 'react';
import {
  RecurringBill,
  RecurringBillReminder,
  CreateRecurringBillInput,
  UpdateRecurringBillInput,
} from '../domain/recurring-bill.model';
import { recurringBillRepository, getDueRemindersUseCase } from '@/core/di/recurring-bills.di';
import { computeNextDueDate } from '../services/compute-next-due-date';

export function useRecurringBills() {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [reminders, setReminders] = useState<RecurringBillReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allBills, dueReminders] = await Promise.all([
        recurringBillRepository.listAll(),
        getDueRemindersUseCase.execute(),
      ]);
      setBills(allBills);
      setReminders(dueReminders);
    } catch (e: any) {
      setError(e.message || 'Failed to load recurring bills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (input: CreateRecurringBillInput) => {
    await recurringBillRepository.create(input);
    await load();
  };

  const update = async (id: string, input: UpdateRecurringBillInput) => {
    await recurringBillRepository.update(id, input);
    await load();
  };

  const remove = async (id: string) => {
    await recurringBillRepository.softDelete(id);
    await load();
  };

  const toggleActive = async (bill: RecurringBill) => {
    await recurringBillRepository.update(bill.id, { is_active: bill.is_active === 1 ? 0 : 1 });
    await load();
  };

  /**
   * Advance a bill's next_due_date to the next cycle.
   * Call this after the user has paid/recorded the bill.
   */
  const advanceDueDate = async (bill: RecurringBill) => {
    const next = computeNextDueDate(bill.next_due_date, bill.frequency);
    await recurringBillRepository.update(bill.id, { next_due_date: next });
    await load();
  };

  return { bills, reminders, loading, error, create, update, remove, toggleActive, advanceDueDate, refresh: load };
}
