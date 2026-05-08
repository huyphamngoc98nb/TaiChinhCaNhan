export type BudgetPeriod = 'weekly' | 'monthly';
export type BudgetStatus = 'safe' | 'warning' | 'exceeded';
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'investment' | 'other';

/** Ngân sách độc lập — tách khỏi categories */
export interface Budget {
  id: string;
  category_id: string;
  wallet_id: string | null;    // null = áp dụng mọi ví
  amount: number;
  period: BudgetPeriod;
  start_date: number;          // epoch ms
  end_date: number | null;     // null = recurring
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface CreateBudgetDto {
  category_id: string;
  wallet_id?: string | null;
  amount: number;
  period: BudgetPeriod;
  start_date: number;
  end_date?: number | null;
}

/** Dùng cho hiển thị UI: budget + thông tin category */
export interface BudgetWithCategory extends Budget {
  category_name: string;
  category_type: 'income' | 'expense';
  icon?: string;
  color?: string;
}

/** @deprecated Dùng BudgetWithCategory thay thế */
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
  budget: BudgetWithCategory;
  spent_amount: number;
  remaining_amount: number;
  percentage: number;
  status: BudgetStatus;
}

/** Wallet / Account model mở rộng */
export interface Wallet {
  id: string;
  name: string;
  currency: string;
  balance: number;
  account_type: AccountType;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  exclude_from_total: boolean;
  created_at: number;
  updated_at: number;
}
