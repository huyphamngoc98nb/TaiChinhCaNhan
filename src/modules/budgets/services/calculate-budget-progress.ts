import { CategoryBudget, BudgetProgress } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';
import { classifyBudgetStatus } from './classify-budget-status';

export class CalculateBudgetProgressUseCase {
  constructor(private repository: IBudgetRepository) {}

  async execute(budget: CategoryBudget, startDate: number, endDate: number): Promise<BudgetProgress | null> {
    if (budget.budget_amount === null || budget.budget_period === null) {
      return null;
    }

    const spent_amount = await this.repository.getSpentAmount(budget.category_id, startDate, endDate);
    const percentage = budget.budget_amount > 0 ? spent_amount / budget.budget_amount : 0;
    const status = classifyBudgetStatus(percentage);

    return {
      budget,
      spent_amount,
      remaining_amount: Math.max(0, budget.budget_amount - spent_amount),
      percentage,
      status,
    };
  }
}
