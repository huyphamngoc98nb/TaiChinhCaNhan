import { BudgetProgress } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';
import { CalculateBudgetProgressUseCase } from './calculate-budget-progress';
import { buildDateRange } from '@/modules/reports/services/build-date-range';

export class ListBudgetAlertsUseCase {
  private calculateProgress: CalculateBudgetProgressUseCase;

  constructor(private repository: IBudgetRepository) {
    this.calculateProgress = new CalculateBudgetProgressUseCase(repository);
  }

  async execute(): Promise<BudgetProgress[]> {
    const allCategories = await this.repository.getAllCategoryBudgets();
    const activeBudgets = allCategories.filter(c => c.budget_amount !== null && c.budget_period !== null);
    
    const progressList: BudgetProgress[] = [];

    for (const budget of activeBudgets) {
      // Determine range based on budget period
      const range = buildDateRange(budget.budget_period === 'weekly' ? 'this_week' : 'this_month');
      
      const progress = await this.calculateProgress.execute(budget, range.startDate, range.endDate);
      if (progress) {
        progressList.push(progress);
      }
    }

    // Sort by percentage descending
    return progressList.sort((a, b) => b.percentage - a.percentage);
  }
}
