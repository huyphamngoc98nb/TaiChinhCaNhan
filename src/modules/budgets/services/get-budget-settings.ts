import { CategoryBudget } from '../domain/budget.model';
import { IBudgetRepository } from '../repositories/budget.repository';

export class GetBudgetSettingsUseCase {
  constructor(private repository: IBudgetRepository) {}

  async execute(): Promise<CategoryBudget[]> {
    return this.repository.getAllCategoryBudgets();
  }
}
