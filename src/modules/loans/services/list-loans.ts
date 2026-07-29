import { normalizeLoanDate, timestampToLoanDate } from '../domain/loan-date';
import type { LoanFilter, LoanSortOrder, LoanWithSummary } from '../domain/loan.model';
import type { ILoanRepository } from '../repositories/loan.repository';

export interface ListLoansDeps {
  loanRepo: ILoanRepository;
}

function comparableLoanDate(loan: LoanWithSummary): string {
  return normalizeLoanDate(loan.loan_date)
    ?? timestampToLoanDate(loan.created_at)
    ?? '';
}

export function sortLoansByLoanDate(
  loans: readonly LoanWithSummary[],
  sortOrder: LoanSortOrder = 'loanDateDesc'
): LoanWithSummary[] {
  const direction = sortOrder === 'loanDateAsc' ? 1 : -1;

  return [...loans].sort((left, right) => {
    const dateComparison = comparableLoanDate(left).localeCompare(comparableLoanDate(right));
    if (dateComparison !== 0) return dateComparison * direction;

    const createdComparison = left.created_at - right.created_at;
    if (createdComparison !== 0) return createdComparison * direction;

    return left.id.localeCompare(right.id) * direction;
  });
}

export async function listLoans(
  filter: LoanFilter,
  deps: ListLoansDeps
): Promise<LoanWithSummary[]> {
  const loans = await deps.loanRepo.listLoans(filter);
  return sortLoansByLoanDate(loans, filter.sortOrder);
}
