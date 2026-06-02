import type {
  CreateLoanInput,
  CreateLoanPaymentInput,
  Loan,
  LoanFilter,
  LoanPayment,
  LoanStatus,
  LoanWithSummary,
  UpdateLoanInput,
} from '../domain/loan.model';

export interface ILoanRepository {
  createLoan(
    data: CreateLoanInput & { id: string; created_at: number; updated_at: number }
  ): Promise<Loan>;
  updateLoan(
    id: string,
    data: UpdateLoanInput & { updated_at: number }
  ): Promise<Loan | null>;
  getLoanById(id: string): Promise<Loan | null>;
  listLoans(filter: LoanFilter): Promise<LoanWithSummary[]>;
  updateLoanStatus(id: string, status: LoanStatus, updated_at: number): Promise<Loan | null>;
  softDeleteLoan(id: string, deleted_at: number): Promise<boolean>;
  hardDeleteLoan(id: string): Promise<boolean>;
  createPayment(data: CreateLoanPaymentInput & { id: string; created_at: number }): Promise<LoanPayment>;
  listPayments(loan_id: string): Promise<LoanPayment[]>;
  getTotalPaid(loan_id: string): Promise<number>;
}
