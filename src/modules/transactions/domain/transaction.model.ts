export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  wallet_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  receipt_path: string | null;
  transaction_date: number; // timestamp
  created_at: number; // timestamp
  updated_at: number; // timestamp
  deleted_at: number | null; // timestamp
}

export interface CreateTransactionInput {
  wallet_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  note?: string;
  receipt_path?: string;
  transaction_date: number;
}

export interface UpdateTransactionInput {
  category_id?: string;
  type?: TransactionType;
  amount?: number;
  note?: string;
  receipt_path?: string;
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
