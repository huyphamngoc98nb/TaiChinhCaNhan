export type TransactionType = 'income' | 'expense' | 'transfer';

export interface TransactionSourceMetadata {
  source_type?: string | null;
  source_id?: string | null;
  source_event?: string | null;
}

export interface Transaction extends TransactionSourceMetadata {
  id: string;
  wallet_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  to_wallet_id: string | null; // required when type = 'transfer'
  exclude_from_total: boolean;
  is_budget_offset?: boolean;
  offset_budget_id?: string | null;
  transaction_date: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  // Join fields
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  wallet_name?: string;
  wallet_currency?: string;
  to_wallet_name?: string;
  offset_budget_name?: string;
}

export interface CreateTransactionInput extends TransactionSourceMetadata {
  wallet_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  note?: string;
  to_wallet_id?: string; // required when type = 'transfer'
  exclude_from_total?: boolean;
  is_budget_offset?: boolean;
  offset_budget_id?: string | null;
  transaction_date: number;
}

export interface UpdateTransactionInput extends TransactionSourceMetadata {
  wallet_id?: string;
  category_id?: string;
  type?: TransactionType;
  amount?: number;
  note?: string;
  to_wallet_id?: string | null;
  exclude_from_total?: boolean;
  is_budget_offset?: boolean;
  offset_budget_id?: string | null;
  transaction_date?: number;
}

export interface TransactionFilter {
  wallet_id?: string;
  category_id?: string;
  type?: TransactionType;
  startDate?: number;
  endDate?: number;
  note?: string;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}
