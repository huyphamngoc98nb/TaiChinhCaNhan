export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  wallet_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  receipt_path: string | null;
  to_wallet_id: string | null; // required when type = 'transfer'
  transaction_date: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  // Join fields
  category_name?: string;
  wallet_name?: string;
}

export interface CreateTransactionInput {
  wallet_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  note?: string;
  receipt_path?: string;
  to_wallet_id?: string; // required when type = 'transfer'
  transaction_date: number;
}

export interface UpdateTransactionInput {
  category_id?: string;
  type?: TransactionType;
  amount?: number;
  note?: string;
  receipt_path?: string;
  to_wallet_id?: string | null;
  transaction_date?: number;
}

export interface TransactionFilter {
  wallet_id?: string;
  category_id?: string;
  type?: TransactionType;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}
