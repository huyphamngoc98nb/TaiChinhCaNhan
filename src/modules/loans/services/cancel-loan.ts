import type { Loan } from '../domain/loan.model';
import type { ILoanRepository } from '../repositories/loan.repository';
import { translations, type TranslationPath } from '@/shared/constants/translations';

function defaultText(path: TranslationPath): string {
  const keys = path.split('.');
  let current: unknown = translations.en;
  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

export interface CancelLoanDeps {
  loanRepo: ILoanRepository;
}

export async function cancelLoan(
  loanId: string,
  deps: CancelLoanDeps
): Promise<Loan | null> {
  const loan = await deps.loanRepo.getLoanById(loanId);
  if (!loan) throw new Error(defaultText('loans.errors.notFound'));
  if (loan.status === 'settled') {
    throw new Error(defaultText('loans.errors.cannotCancelSettled'));
  }

  return deps.loanRepo.updateLoanStatus(loanId, 'cancelled', Date.now());
}
