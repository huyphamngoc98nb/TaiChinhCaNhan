export type AccountType = 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'investment' | 'other';

export interface Wallet {
  id: string;
  name: string;
  currency: string;
  balance: number;
  account_type: AccountType;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: 0 | 1;
  exclude_from_total: 0 | 1;
  credit_limit: number | null;
  statement_day: number | null;
  due_day: number | null;
  created_at: number;
  updated_at: number;
}

export interface CreateWalletInput {
  name: string;
  currency: string;
  balance: number;
  account_type: AccountType;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
  exclude_from_total?: 0 | 1;
  credit_limit?: number | null;
  statement_day?: number | null;
  due_day?: number | null;
}

export interface UpdateWalletInput {
  name?: string;
  currency?: string;
  account_type?: AccountType;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
  is_active?: 0 | 1;
  exclude_from_total?: 0 | 1;
  credit_limit?: number | null;
  statement_day?: number | null;
  due_day?: number | null;
}

export interface WalletReferenceCounts {
  transactions: number;
  recurringBills: number;
  budgets: number;
}

export interface IWalletRepository {
  getById(id: string): Promise<Wallet | null>;
  getAllActive(): Promise<Wallet[]>;
  getTotalBalance(): Promise<number>;
  create(id: string, data: CreateWalletInput, now: number): Promise<void>;
  update(id: string, data: UpdateWalletInput, now: number): Promise<void>;
  getReferenceCounts(id: string): Promise<WalletReferenceCounts>;
  delete(id: string): Promise<void>;
  updateBalance(id: string, newBalance: number, updatedAt: number): Promise<void>;
  updateBalanceDelta(id: string, delta: number, updatedAt: number): Promise<void>;
}
