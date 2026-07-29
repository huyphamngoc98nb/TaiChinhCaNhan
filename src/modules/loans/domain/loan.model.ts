export type LoanType = 'lend' | 'borrow';

export type LoanStatus = 'active' | 'settled' | 'cancelled';

export type LoanSortOrder = 'loanDateDesc' | 'loanDateAsc';

export interface Loan {
  id: string;
  wallet_id: string | null;
  skip_transaction: boolean;
  linked_transaction_id?: string | null;
  exclude_from_total?: boolean;
  type: LoanType;
  contact_name: string;
  contact_info: string | null;
  principal: number;
  loan_date?: string | null;
  due_date: string | null;
  note: string | null;
  status: LoanStatus;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  wallet_id: string;
  amount: number;
  payment_date: number;
  note: string | null;
  created_at: number;
}

export interface LoanWithSummary extends Loan {
  paid_amount: number;
  remaining: number;
  wallet_name?: string;
}

export interface CreateLoanInput {
  wallet_id?: string | null;
  skip_transaction?: boolean;
  linked_transaction_id?: string | null;
  exclude_from_total?: boolean;
  type: LoanType;
  contact_name: string;
  contact_info?: string;
  principal: number;
  loan_date?: string;
  due_date?: string;
  note?: string;
}

export type UpdateLoanInput = CreateLoanInput;

export interface CreateLoanPaymentInput {
  loan_id: string;
  wallet_id: string;
  amount: number;
  payment_date: number;
  note?: string;
  exclude_from_total?: boolean;
}

export interface LoanFilter {
  status?: LoanStatus;
  type?: LoanType;
  includeDeleted?: boolean;
  sortOrder?: LoanSortOrder;
}
