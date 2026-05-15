import { useMemo } from 'react';
import { useBudgets } from '@/modules/budgets/hooks/useBudgets';
import { useRecurringBills } from '@/modules/recurring-bills/hooks/useRecurringBills';
import { useWallets } from '@/modules/wallets/hooks/useWallets';
import { buildDashboardViewModel } from '../services/build-dashboard-view-model';

export function useDashboard() {
  const { alerts, allProgress, isLoading: budgetLoading } = useBudgets();
  const { reminders } = useRecurringBills();
  const { wallets, totalBalance, loading: walletLoading } = useWallets();

  return useMemo(
    () =>
      buildDashboardViewModel({
        alerts,
        allProgress,
        budgetLoading,
        reminders,
        totalBalance,
        walletLoading,
        wallets,
      }),
    [alerts, allProgress, budgetLoading, reminders, totalBalance, walletLoading, wallets]
  );
}
