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

export interface PeriodSummary {
  period: string; // Format depends on granularity ('YYYY-MM-DD', 'YYYY-Wxx', or 'YYYY-MM')
  income: number;
  expense: number;
}

export interface CashflowSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}
