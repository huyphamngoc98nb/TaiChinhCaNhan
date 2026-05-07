import { CategoryBudget, BudgetPeriod } from '../domain/budget.model';

export interface IBudgetRepository {
  getAllCategoryBudgets(): Promise<CategoryBudget[]>;
  getCategoryBudget(categoryId: string): Promise<CategoryBudget | null>;
  upsertCategoryBudget(categoryId: string, amount: number | null, period: BudgetPeriod | null): Promise<void>;
  getSpentAmount(categoryId: string, startDate: number, endDate: number): Promise<number>;
}
