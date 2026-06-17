import { sqliteTransactionRunner as runInTransaction } from '@/core/db/transaction-runner';
import { generateUUID } from '@/shared/utils/generate-uuid';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import { getSourceDelta } from '@/modules/transactions/services/transaction-wallet-rules';
import type { IWalletRepository } from '@/modules/wallets/repositories/wallet.repository';
import type { Loan, UpdateLoanInput } from '../domain/loan.model';
import { validateUpdateLoan } from '../domain/loan.schema';
import type { ILoanRepository } from '../repositories/loan.repository';
import {
  dateToMs,
  LOAN_CREATE_CATEGORY,
  msToLocalDate,
  resolveLoanCategoryId,
  type LoanCategoryRepository,
} from './create-loan';
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

export interface UpdateLoanDeps {
  loanRepo: ILoanRepository;
  walletRepo: IWalletRepository;
  transactionRepo: ITransactionRepository;
  categoryRepo: LoanCategoryRepository;
}

export async function updateLoan(
  id: string,
  input: UpdateLoanInput,
  deps: UpdateLoanDeps
): Promise<Loan> {
  const existingLoan = await deps.loanRepo.getLoanById(id);
  if (!existingLoan) throw new Error(defaultText('loans.errors.notFound'));

  const wasSkipping = existingLoan.skip_transaction === true;
  const willSkip = input.skip_transaction ?? wasSkipping;
  const walletId = willSkip
    ? null
    : input.wallet_id !== undefined
      ? input.wallet_id
      : existingLoan.wallet_id;

  validateUpdateLoan({
    ...input,
    wallet_id: walletId,
    skip_transaction: willSkip,
  });

  if (!willSkip) {
    if (!walletId) throw new Error('wallet_id is required');

    const wallet = await deps.walletRepo.getById(walletId);
    if (!wallet) throw new Error(defaultText('loans.errors.walletNotFound'));
    if (wallet.is_active !== 1) throw new Error(defaultText('loans.errors.walletInactive'));
  }

  const now = Date.now();
  const loanDate = input.loan_date ?? existingLoan.loan_date ?? msToLocalDate(existingLoan.created_at);

  return runInTransaction(async () => {
    let linkedTransactionId = existingLoan.linked_transaction_id ?? null;

    if (!wasSkipping && willSkip) {
      if (existingLoan.linked_transaction_id) {
        const linkedTransaction = await deps.transactionRepo.getById(existingLoan.linked_transaction_id);
        const wasDeleted = await deps.transactionRepo.softDelete(existingLoan.linked_transaction_id, now);

        if (wasDeleted && linkedTransaction) {
          await deps.walletRepo.updateBalanceDelta(
            linkedTransaction.wallet_id,
            -getSourceDelta(linkedTransaction.type, linkedTransaction.amount),
            now
          );
        }
      }
      linkedTransactionId = null;
    } else if (wasSkipping && !willSkip) {
      const categoryConfig = LOAN_CREATE_CATEGORY[input.type];
      const categoryId = await resolveLoanCategoryId(
        deps.categoryRepo,
        categoryConfig.slug,
        categoryConfig.type
      );
      const transactionId = generateUUID();
      const transactionType = input.type === 'lend' ? 'expense' : 'income';
      const transactionNote = input.type === 'lend'
        ? defaultText('loans.errors.lendNote').replace('{name}', input.contact_name)
        : defaultText('loans.errors.borrowNote').replace('{name}', input.contact_name);
      const transactionDate = dateToMs(loanDate);

      await deps.transactionRepo.create({
        id: transactionId,
        wallet_id: walletId as string,
        category_id: categoryId,
        type: transactionType,
        amount: input.principal,
        note: transactionNote,
        transaction_date: transactionDate,
        created_at: now,
        updated_at: now,
      });
      await deps.walletRepo.updateBalanceDelta(
        walletId as string,
        getSourceDelta(transactionType, input.principal),
        now
      );
      linkedTransactionId = transactionId;
    }

    const loan = await deps.loanRepo.updateLoan(id, {
      ...input,
      loan_date: loanDate,
      wallet_id: walletId,
      skip_transaction: willSkip,
      linked_transaction_id: linkedTransactionId,
      updated_at: now,
    });

    if (!loan) throw new Error(defaultText('loans.errors.updateFailed'));
    return loan;
  });
}
