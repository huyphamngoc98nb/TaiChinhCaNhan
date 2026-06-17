import { sqliteTransactionRunner as runInTransaction } from '@/core/db/transaction-runner';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import { getSourceDelta } from '@/modules/transactions/services/transaction-wallet-rules';
import type { IWalletRepository } from '@/modules/wallets/repositories/wallet.repository';
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

export type DeleteLoanMode = 'soft' | 'hard';

export class LoanHasPaymentsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoanHasPaymentsError';
  }
}

export interface DeleteLoanDeps {
  loanRepo: ILoanRepository;
  transactionRepo: ITransactionRepository;
  walletRepo: IWalletRepository;
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
  if (!loan) throw new Error(defaultText('loans.errors.notFound'));

  if (mode === 'soft') {
    await deps.loanRepo.softDeleteLoan(loanId, Date.now());
    return;
  }

  const totalPaid = await deps.loanRepo.getTotalPaid(loanId);
  const isSettled = loan.status === 'settled' || totalPaid >= loan.principal;
  if (!options.force && totalPaid > 0) {
    throw new LoanHasPaymentsError(
      defaultText('loans.errors.hardDeleteHasPayments').replace('{amount}', totalPaid.toLocaleString('vi-VN'))
    );
  }

  const now = Date.now();

  await runInTransaction(async () => {
    // An unsettled loan still represents an outstanding principal movement.
    // Remove its generated transaction and reverse that cached wallet balance
    // delta before deleting the loan. Settled loans keep their completed history.
    if (!isSettled) {
      if (loan.linked_transaction_id) {
        const linkedTransaction = await deps.transactionRepo.getByIdIncludeDeleted(
          loan.linked_transaction_id
        );

        if (linkedTransaction?.deleted_at === null) {
          const wasDeleted = await deps.transactionRepo.softDelete(linkedTransaction.id, now);

          if (wasDeleted) {
            await deps.walletRepo.updateBalanceDelta(
              linkedTransaction.wallet_id,
              -getSourceDelta(linkedTransaction.type, linkedTransaction.amount),
              now
            );
          }
        }
      }

      const paymentTransactionType = loan.type === 'lend' ? 'income' : 'expense';
      const payments = await deps.loanRepo.listPayments(loanId);
      for (const payment of payments) {
        await deps.walletRepo.updateBalanceDelta(
          payment.wallet_id,
          -getSourceDelta(paymentTransactionType, payment.amount),
          now
        );
      }
    }

    await deps.loanRepo.hardDeleteLoan(loanId);
  });
}
