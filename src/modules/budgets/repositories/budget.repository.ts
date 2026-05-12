import { Budget, BudgetWithCategory, BudgetPeriod, CreateBudgetDto, AccountType } from '../domain/budget.model';

export interface IBudgetRepository {
  /** Lấy tất cả budget đang active theo period, tuỳ chọn scope theo wallet */
  getActiveBudgets(period: BudgetPeriod, walletId?: string): Promise<BudgetWithCategory[]>;

  /**
   * Lấy budgets active scope theo account_type
   * (wallet_id IS NULL, account_type_scope = type)
   */
  getActiveBudgetsByAccountType(
    period: BudgetPeriod,
    accountType: AccountType
  ): Promise<BudgetWithCategory[]>;

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

  /**
   * Tính tổng chi tiêu trong tất cả ví thuộc account_type
   */
  getSpentAmountByAccountType(
    categoryId: string,
    startDate: number,
    endDate: number,
    accountType: AccountType
  ): Promise<number>;

  getAllCategoryBudgets(): Promise<any[]>;
  upsertCategoryBudget(categoryId: string, amount: number | null, period: 'weekly' | 'monthly' | null): Promise<void>;
  deleteCategoryBudget(categoryId: string): Promise<void>;
}
