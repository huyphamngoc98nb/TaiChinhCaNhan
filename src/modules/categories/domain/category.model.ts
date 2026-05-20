export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface CategoryInput {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
}

export interface CategoryReferenceCounts {
  transactions: number;
  recurringBills: number;
  budgets: number;
}

export const TRANSFER_CATEGORY_ID = 'cat-transfer';
