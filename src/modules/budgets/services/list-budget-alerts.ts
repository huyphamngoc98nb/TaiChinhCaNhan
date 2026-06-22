import { BudgetProgress, BudgetPeriod } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';
import { CalculateBudgetProgressUseCase } from './calculate-budget-progress';
import { buildDateRange } from '@/modules/reports/services/build-date-range';
import { sortBudgetProgressByAttention } from '@/modules/reports/services/financial-calculations';
import {
  DEFAULT_DISPLAY_FORMAT_SETTINGS,
  type DisplayFormatSettings,
} from '@/modules/settings/services/display-format-settings.service';

export class ListBudgetAlertsUseCase {
  private calculateProgress: CalculateBudgetProgressUseCase;

  constructor(private repository: IBudgetRepository) {
    this.calculateProgress = new CalculateBudgetProgressUseCase(repository);
  }

  /**
   * Load tất cả budgets active (wallet-scope + global), tính progress.
   * CalculateBudgetProgressUseCase tự phân nhánh theo BudgetScope:
   *   wallet → getSpentAmount(walletId)
   *   account_type → getSpentAmountByAccountType(accountType)
   *   global → getSpentAmount()
   *
   * @param walletId - tuỳ chọn scope theo ví; undefined = tất cả ví
   */
  async execute(
    walletId?: string,
    displayFormatSettings: DisplayFormatSettings = DEFAULT_DISPLAY_FORMAT_SETTINGS
  ): Promise<BudgetProgress[]> {
    const [weekly, monthly] = await Promise.all([
      this.repository.getActiveBudgets('weekly' as BudgetPeriod, walletId),
      this.repository.getActiveBudgets('monthly' as BudgetPeriod, walletId),
    ]);

    const allBudgets = [...weekly, ...monthly];

    const progressList = (await Promise.all(
      allBudgets.map(budget => {
        const rangeKey = budget.period === 'weekly' ? 'this_week' : 'this_month';
        const range = buildDateRange(rangeKey, undefined, displayFormatSettings);
        return this.calculateProgress.execute(budget, range.startDate, range.endDate);
      })
    )).filter((p): p is BudgetProgress => p !== null);

    return sortBudgetProgressByAttention(progressList);
  }
}
