export type BudgetPeriod = 'weekly' | 'monthly';
export type BudgetStatus = 'safe' | 'warning' | 'exceeded';
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'investment' | 'other';

/** Label tiếng Việt cho từng AccountType */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash:        'Tiền mặt',
  bank:        'Tài khoản ngân hàng',
  credit_card: 'Thẻ tín dụng',
  e_wallet:    'Ví điện tử',
  investment:  'Đầu tư',
  other:       'Khác',
};

/** Ngân sách độc lập — tách khỏi categories */
export interface Budget {
  id: string;
  category_id: string;
  wallet_id: string | null;              // null = áp dụng mọi ví
  account_type_scope: AccountType | null; // null = áp dụng tất cả loại TK
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
  account_type_scope?: AccountType | null;
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

/**
 * MINOR-3: CategoryBudget được giữ lại để tương thích ngược với các file chưa migrate.
 * @deprecated Sử dụng BudgetWithCategory thay thế.
 * TODO: Xóa sau khi toàn bộ consumer đã chuyển sang BudgetWithCategory.
 */
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

/** Budget scope: xác định phạm vi áp dụng của budget */
export type BudgetScope =
  | { type: 'global' }                                        // wallet_id=null, account_type_scope=null
  | { type: 'wallet'; walletId: string }                      // wallet_id=ID, account_type_scope=null
  | { type: 'account_type'; accountType: AccountType };       // wallet_id=null, account_type_scope=TYPE

/** Helper: resolve BudgetScope từ Budget record */
export function resolveBudgetScope(budget: Budget): BudgetScope {
  if (budget.wallet_id) return { type: 'wallet', walletId: budget.wallet_id };
  if (budget.account_type_scope) return { type: 'account_type', accountType: budget.account_type_scope };
  return { type: 'global' };
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
