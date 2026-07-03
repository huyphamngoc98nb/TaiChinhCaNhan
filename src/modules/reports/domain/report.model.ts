export interface DateRange {
  startDate: number; // Unix timestamp in milliseconds
  endDate: number;   // Unix timestamp in milliseconds
}

export type ReportGranularity = 'day' | 'week' | 'month';

export interface CategorySummary {
  category_id: string;
  category_name: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface WalletSummary {
  wallet_id: string;
  wallet_name: string;
  amount: number;
}

export interface PeriodSummary {
  period: string; // Format depends on granularity ('YYYY-MM-DD', 'YYYY-Wxx', or 'YYYY-MM')
  income: number;
  expense: number;
}

export interface CashflowSummary {
  grossIncome: number;
  grossExpense: number;
  totalOffset: number;
  netExpense: number;
  // Backward-compatible aliases used by existing report, forecast, and export consumers.
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}

export type BudgetReportStatus =
  | 'NO_BUDGET'
  | 'IN_BUDGET'
  | 'NEAR_LIMIT'
  | 'OVER_BUDGET';

export interface BudgetReportQuery {
  range: DateRange;
  categoryId?: string;
  walletId?: string;
}

export interface BudgetReportFilters extends BudgetReportQuery {
  status?: BudgetReportStatus;
}

export interface BudgetReportBudgetSource {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: 'weekly' | 'monthly';
  startDate: number;
  endDate: number | null;
}

export interface BudgetReportSpendingSource {
  categoryId: string;
  categoryName: string;
  actualSpending: number;
}

export interface BudgetReportTrendSource {
  date: string;
  categoryId: string;
  actualSpending: number;
}

export interface BudgetReportSource {
  budgets: BudgetReportBudgetSource[];
  spending: BudgetReportSpendingSource[];
  trend: BudgetReportTrendSource[];
}

export interface BudgetReportAmounts {
  totalBudget: number;
  totalActualSpending: number;
  remainingAmount: number;
  overspentAmount: number;
  usagePercentage: number;
  status: BudgetReportStatus;
}

export interface BudgetReportCategory {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  actualSpending: number;
  remainingAmount: number;
  overspentAmount: number;
  usagePercentage: number;
  status: BudgetReportStatus;
}

export interface BudgetReportTrendPoint {
  date: string;
  actualSpending: number;
}

export interface BudgetReport {
  period: DateRange;
  summary: BudgetReportAmounts;
  categories: BudgetReportCategory[];
  trend: BudgetReportTrendPoint[];
  trendGranularity: ReportGranularity;
  hasBudget: boolean;
  hasSpending: boolean;
}
