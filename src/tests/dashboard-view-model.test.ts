import { describe, expect, it } from 'vitest';
import type { BudgetProgress } from '@/modules/budgets/domain/budget.model';
import type { RecurringBillReminder } from '@/modules/recurring-bills/domain/recurring-bill.model';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import {
  buildDashboardViewModel,
  formatVND,
  getTopBudgets,
} from '@/modules/transactions/services/build-dashboard-view-model';

function makeBudgetProgress(
  categoryId: string,
  status: BudgetProgress['status']
): BudgetProgress {
  return {
    budget: {
      id: `budget-${categoryId}`,
      category_id: categoryId,
      wallet_id: null,
      account_type_scope: null,
      amount: 100,
      period: 'monthly',
      start_date: 0,
      end_date: null,
      is_active: true,
      created_at: 0,
      updated_at: 0,
      category_name: categoryId,
      category_type: 'expense',
    },
    spent_amount: 0,
    remaining_amount: 100,
    percentage: 0,
    status,
  };
}

describe('dashboard view model', () => {
  it('orders top budgets by severity and limits to five', () => {
    const topBudgets = getTopBudgets([
      makeBudgetProgress('safe-1', 'safe'),
      makeBudgetProgress('warning-1', 'warning'),
      makeBudgetProgress('exceeded-1', 'exceeded'),
      makeBudgetProgress('safe-2', 'safe'),
      makeBudgetProgress('warning-2', 'warning'),
      makeBudgetProgress('exceeded-2', 'exceeded'),
    ]);

    expect(topBudgets.map((item) => item.status)).toEqual([
      'exceeded',
      'exceeded',
      'warning',
      'warning',
      'safe',
    ]);
  });

  it('builds flags and reminder counts for the dashboard page', () => {
    const reminders = [
      { status: 'overdue' },
      { status: 'upcoming' },
      { status: 'overdue' },
    ] as RecurringBillReminder[];

    const viewModel = buildDashboardViewModel({
      alerts: [makeBudgetProgress('warning', 'warning')],
      allProgress: [],
      budgetLoading: false,
      reminders,
      totalBalance: 250_000,
      walletLoading: false,
      wallets: [{ id: 'wallet-1' }] as Wallet[],
    });

    expect(viewModel.hasAlerts).toBe(true);
    expect(viewModel.hasBills).toBe(true);
    expect(viewModel.overdueBillCount).toBe(2);
    expect(viewModel.showEmptyState).toBe(false);
  });

  it('formats compact VND labels', () => {
    expect(formatVND(950_000)).toBe('950.000');
    expect(formatVND(1_500_000)).toBe('1.5 tr');
    expect(formatVND(2_000_000_000)).toBe('2.0 tỷ');
  });
});
