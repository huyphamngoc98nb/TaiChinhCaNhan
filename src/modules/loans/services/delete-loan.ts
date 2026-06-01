import type { Loan } from '../domain/loan.model';
import type { ILoanRepository } from '../repositories/loan.repository';

export type DeleteLoanMode = 'soft' | 'hard';

export class LoanHasPaymentsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoanHasPaymentsError';
  }
}

export interface DeleteLoanDeps {
  loanRepo: ILoanRepository;
}

async function getLoanForDelete(loanId: string, loanRepo: ILoanRepository): Promise<Loan | null> {
  const activeLoan = await loanRepo.getLoanById(loanId);
  if (activeLoan) return activeLoan;

  const allLoans = await loanRepo.listLoans({ includeDeleted: true });
  return allLoans.find((loan) => loan.id === loanId) ?? null;
}

export async function deleteLoan(
  loanId: string,
  mode: DeleteLoanMode,
  deps: DeleteLoanDeps,
  options: { force?: boolean } = {}
): Promise<void> {
  const loan = await getLoanForDelete(loanId, deps.loanRepo);
  if (!loan) throw new Error('Không tìm thấy khoản vay');

  if (mode === 'soft') {
    await deps.loanRepo.softDeleteLoan(loanId, Date.now());
    return;
  }

  const totalPaid = await deps.loanRepo.getTotalPaid(loanId);
  if (!options.force && totalPaid > 0) {
    throw new LoanHasPaymentsError(
      `Khoản này đã có ${totalPaid.toLocaleString('vi-VN')}đ thanh toán. Xoá vĩnh viễn sẽ mất toàn bộ lịch sử.`
    );
  }

  // Hard delete only removes the loan and loan_payments via FK cascade.
  // Wallet transactions are historical records and must be deleted manually from Transactions if needed.
  await deps.loanRepo.hardDeleteLoan(loanId);
}
