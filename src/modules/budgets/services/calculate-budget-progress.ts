import { BudgetWithCategory, BudgetProgress } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';
import { classifyBudgetStatus } from './classify-budget-status';

export class CalculateBudgetProgressUseCase {
  constructor(private repository: IBudgetRepository) {}

  async execute(
    budget: BudgetWithCategory,
    startDate: number,
    endDate: number,
    walletId?: string
  ): Promise<BudgetProgress> {
    const spent_amount = await this.repository.getSpentAmount(
      budget.category_id,
      startDate,
      endDate,
      walletId
    );
    const percentage = budget.amount > 0 ? spent_amount / budget.amount : 0;
    const status = classifyBudgetStatus(percentage);

    return {
      budget,
      spent_amount,
      remaining_amount: Math.max(0, budget.amount - spent_amount),
      percentage,
      status,
    };
  }
}
