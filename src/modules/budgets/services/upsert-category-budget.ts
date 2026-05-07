import { BudgetPeriod } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';
import { Capacitor } from '@capacitor/core';

export class UpsertCategoryBudgetUseCase {
  constructor(private repository: IBudgetRepository) {}

  async execute(categoryId: string, amount: number | null, period: BudgetPeriod | null): Promise<void> {
    if (amount !== null && amount <= 0) {
      throw new Error('Budget amount must be greater than 0');
    }
    
    // If one is set, both must be set
    if ((amount === null && period !== null) || (amount !== null && period === null)) {
      throw new Error('Both amount and period must be provided, or both must be null to clear the budget');
    }

    await this.repository.upsertCategoryBudget(categoryId, amount, period);

    const isWeb = Capacitor.getPlatform() === 'web';
    if (isWeb) {
      const { sqlite } = await import('@/core/db/sqlite/pragmas');
      const { DB_NAME } = await import('@/core/db/sqlite/connection');
      await sqlite.saveToStore(DB_NAME);
    }
  }
}
