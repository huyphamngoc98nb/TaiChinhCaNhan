import { BudgetPeriod, AccountType } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';
import { Capacitor } from '@capacitor/core';

export class UpsertCategoryBudgetUseCase {
  constructor(private repository: IBudgetRepository) {}

  async execute(
    categoryId: string,
    amount: number | null,
    period: BudgetPeriod | null,
    accountTypeScope: AccountType | null = null
  ): Promise<void> {
    if (amount !== null && amount <= 0) {
      throw new Error('Budget amount must be greater than 0');
    }

    // Nếu 1 cái null thì cả 2 phải null (clear)
    if ((amount === null && period !== null) || (amount !== null && period === null)) {
      throw new Error('Both amount and period must be provided');
    }

    if (amount !== null && period !== null) {
      // Dùng upsertBudget thay vì upsertCategoryBudget để support account_type_scope
      await this.repository.upsertBudget({
        category_id: categoryId,
        wallet_id: null,
        account_type_scope: accountTypeScope,
        amount,
        period,
        start_date: computeStartDate(period),
      });
    } else {
      // clear: deactivate tất cả budget của category này (global + account_type scope)
      await this.repository.upsertCategoryBudget(categoryId, null, null);
    }

    const isWeb = Capacitor.getPlatform() === 'web';
    if (isWeb) {
      const { sqlite } = await import('@/core/db/sqlite/pragmas');
      const { DB_NAME } = await import('@/core/db/sqlite/connection');
      await sqlite.saveToStore(DB_NAME);
    }
  }
}

export function computeStartDate(period: BudgetPeriod): number {
  const d = new Date();
  if (period === 'monthly') {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else {
    const day = d.getDay() || 7; // Mon=1 … Sun=7
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
  }
  return d.getTime();
}
