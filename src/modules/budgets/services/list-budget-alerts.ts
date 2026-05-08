import { BudgetProgress, BudgetPeriod } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';
import { CalculateBudgetProgressUseCase } from './calculate-budget-progress';
import { buildDateRange } from '@/modules/reports/services/build-date-range';

export class ListBudgetAlertsUseCase {
  private calculateProgress: CalculateBudgetProgressUseCase;

  constructor(private repository: IBudgetRepository) {
    this.calculateProgress = new CalculateBudgetProgressUseCase(repository);
  }

  /**
   * @param walletId - tuỳ chọn lọc theo ví; undefined = tất cả ví
   */
  async execute(walletId?: string): Promise<BudgetProgress[]> {
    // Gộp cả 2 period để hiển thị đầy đủ
    const [weekly, monthly] = await Promise.all([
      this.repository.getActiveBudgets('weekly', walletId),
      this.repository.getActiveBudgets('monthly', walletId),
    ]);
    const allBudgets = [...weekly, ...monthly];

    const progressList: BudgetProgress[] = await Promise.all(
      allBudgets.map(budget => {
        const range = buildDateRange(
          (budget.period as BudgetPeriod) === 'weekly' ? 'this_week' : 'this_month'
        );
        return this.calculateProgress.execute(budget, range.startDate, range.endDate, walletId);
      })
    );

    // Sắp xếp theo % giảm dần (vượt ngân sách lên trên)
    return progressList.sort((a, b) => b.percentage - a.percentage);
  }
}
