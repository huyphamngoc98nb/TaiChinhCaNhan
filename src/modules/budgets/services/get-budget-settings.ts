import { BudgetWithCategory, BudgetPeriod } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';

export class GetBudgetSettingsUseCase {
  constructor(private repository: IBudgetRepository) {}

  /**
   * Trả về toàn bộ budget đang active cho cả 2 period.
   * @param walletId - tuỳ chọn lọc theo ví
   */
  async execute(walletId?: string): Promise<BudgetWithCategory[]> {
    const [weekly, monthly] = await Promise.all([
      this.repository.getActiveBudgets('weekly' as BudgetPeriod, walletId),
      this.repository.getActiveBudgets('monthly' as BudgetPeriod, walletId),
    ]);
    return [...weekly, ...monthly];
  }
}
