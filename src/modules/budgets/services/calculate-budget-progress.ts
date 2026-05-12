import { CategoryBudget, BudgetProgress } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';
import { classifyBudgetStatus } from './classify-budget-status';

export class CalculateBudgetProgressUseCase {
  constructor(private repository: IBudgetRepository) {}

  async execute(budget: any, startDate: number, endDate: number): Promise<BudgetProgress | null> {
    const amount = budget.amount !== undefined ? budget.amount : budget.budget_amount;
    const period = budget.period !== undefined ? budget.period : budget.budget_period;
    const category_id = budget.category_id;

    if (amount === null || period === null || amount === undefined) {
      return null;
    }

    const spent_amount = await this.repository.getSpentAmount(category_id, startDate, endDate);
    const percentage = amount > 0 ? spent_amount / amount : 0;
    const status = classifyBudgetStatus(percentage);

    return {
      budget,
      spent_amount,
      remaining_amount: amount - spent_amount,
      percentage,
      status,
    };
  }
}
