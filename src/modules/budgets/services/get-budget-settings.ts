import { BudgetWithCategory, BudgetPeriod } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';

export class GetBudgetSettingsUseCase {
  constructor(private repository: IBudgetRepository) {}

  /**
   * Trả về toàn bộ budget đang active cho cả 2 period (weekly + monthly).
   *
   * NOTE: getAllCategoryBudgets() đã bị xóa khỏi IBudgetRepository trong migration 012.
   * Sử dụng getActiveBudgets() thay thế — cùng pattern với ListBudgetAlertsUseCase.
   *
   * @param walletId - tuỳ chọn scope theo ví; undefined = tất cả ví
   */
  async execute(walletId?: string): Promise<BudgetWithCategory[]> {
    const [weekly, monthly] = await Promise.all([
      this.repository.getActiveBudgets('weekly' as BudgetPeriod, walletId),
      this.repository.getActiveBudgets('monthly' as BudgetPeriod, walletId),
    ]);
    return [...weekly, ...monthly];
  }
}
