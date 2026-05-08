export type BudgetPeriod = 'weekly' | 'monthly';
export type BudgetStatus = 'safe' | 'warning' | 'exceeded';

export interface CategoryBudget {
  category_id: string;
  category_name: string;
  type: 'income' | 'expense';
  icon?: string;
  color?: string;
  budget_amount: number | null;
  budget_period: BudgetPeriod | null;
}

export interface BudgetProgress {
  budget: CategoryBudget;
  spent_amount: number;
  remaining_amount: number;
  percentage: number;
  status: BudgetStatus;
}
