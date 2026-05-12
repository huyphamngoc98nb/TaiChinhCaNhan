import { Budget, BudgetWithCategory, BudgetPeriod, CreateBudgetDto } from '../domain/budget.model';

export interface IBudgetRepository {
  /** Lấy tất cả budget đang active theo period, tuỳ chọn scope theo wallet */
  getActiveBudgets(period: BudgetPeriod, walletId?: string): Promise<BudgetWithCategory[]>;

  /** Lấy 1 budget theo id */
  getBudgetById(budgetId: string): Promise<Budget | null>;

  /** Tạo mới hoặc cập nhật budget */
  upsertBudget(dto: CreateBudgetDto): Promise<void>;

  /** Vô hiệu hoá budget (soft deactivate) */
  deactivateBudget(budgetId: string): Promise<void>;

  /**
   * Tính tổng chi tiêu của 1 category trong khoảng thời gian.
   * @param walletId - nếu truyền thì chỉ tính trong ví đó; undefined = tất cả ví
   */
  getSpentAmount(
    categoryId: string,
    startDate: number,
    endDate: number,
    walletId?: string
  ): Promise<number>;

  getAllCategoryBudgets(): Promise<any[]>;
  upsertCategoryBudget(categoryId: string, amount: number | null, period: 'weekly' | 'monthly' | null): Promise<void>;
  deleteCategoryBudget(categoryId: string): Promise<void>;
}
