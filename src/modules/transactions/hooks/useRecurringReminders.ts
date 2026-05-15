import { useMemo } from 'react';
import { useRecurringBills } from '@/modules/recurring-bills/hooks/useRecurringBills';

export function useRecurringReminders() {
  const { reminders, loading, error, refresh } = useRecurringBills();

  const overdueBillCount = useMemo(
    () => reminders.filter((reminder) => reminder.status === 'overdue').length,
    [reminders]
  );

  return {
    reminders,
    hasBills: reminders.length > 0,
    overdueBillCount,
    loading,
    error,
    refresh,
  };
}
