import type { BudgetProgress, BudgetStatus } from '@/modules/budgets/domain/budget.model';
import type { RecurringBillReminder } from '@/modules/recurring-bills/domain/recurring-bill.model';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';

const BUDGET_STATUS_ORDER: Record<BudgetStatus, number> = {
  exceeded: 0,
  warning: 1,
  safe: 2,
};

export interface DashboardViewModelInput {
  alerts: BudgetProgress[];
  allProgress: BudgetProgress[];
  budgetLoading: boolean;
  reminders: RecurringBillReminder[];
  totalBalance: number;
  walletLoading: boolean;
  wallets: Wallet[];
}

export interface DashboardViewModel {
  alerts: BudgetProgress[];
  budgetLoading: boolean;
  hasAlerts: boolean;
  hasBills: boolean;
  overdueBillCount: number;
  reminders: RecurringBillReminder[];
  showEmptyState: boolean;
  topBudgets: BudgetProgress[];
  totalBalance: number;
  walletLoading: boolean;
  wallets: Wallet[];
}

export function formatVND(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} tr`;
  }

  return value.toLocaleString('vi-VN');
}

export function getTopBudgets(progress: BudgetProgress[]): BudgetProgress[] {
  return [...progress]
    .sort((a, b) => BUDGET_STATUS_ORDER[a.status] - BUDGET_STATUS_ORDER[b.status])
    .slice(0, 5);
}

export function buildDashboardViewModel(input: DashboardViewModelInput): DashboardViewModel {
  const topBudgets = getTopBudgets(input.allProgress);
  const hasAlerts = input.alerts.length > 0;
  const hasBills = input.reminders.length > 0;

  return {
    alerts: input.alerts,
    budgetLoading: input.budgetLoading,
    hasAlerts,
    hasBills,
    overdueBillCount: input.reminders.filter((reminder) => reminder.status === 'overdue').length,
    reminders: input.reminders,
    showEmptyState:
      !input.walletLoading &&
      input.wallets.length === 0 &&
      topBudgets.length === 0 &&
      !hasAlerts,
    topBudgets,
    totalBalance: input.totalBalance,
    walletLoading: input.walletLoading,
    wallets: input.wallets,
  };
}
