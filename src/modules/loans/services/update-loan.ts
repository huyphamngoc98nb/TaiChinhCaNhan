import { sqliteTransactionRunner as runInTransaction } from '@/core/db/transaction-runner';
import { generateUUID } from '@/shared/utils/generate-uuid';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import type { IWalletRepository } from '@/modules/wallets/repositories/wallet.repository';
import type { Loan, UpdateLoanInput } from '../domain/loan.model';
import { validateUpdateLoan } from '../domain/loan.schema';
import type { ILoanRepository } from '../repositories/loan.repository';
import {
  dateToMs,
  LOAN_CREATE_CATEGORY,
  resolveLoanCategoryId,
  type LoanCategoryRepository,
} from './create-loan';

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
  if (!existingLoan) throw new Error('Loan not found');

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
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.is_active !== 1) throw new Error('Wallet is inactive');
  }

  const now = Date.now();

  return runInTransaction(async () => {
    let linkedTransactionId = existingLoan.linked_transaction_id ?? null;

    if (!wasSkipping && willSkip) {
      if (existingLoan.linked_transaction_id) {
        await deps.transactionRepo.softDelete(existingLoan.linked_transaction_id, now);
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
        ? `Cho vay: ${input.contact_name}`
        : `Vay nợ: ${input.contact_name}`;
      const transactionDate = input.due_date ? dateToMs(input.due_date) : now;

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
      linkedTransactionId = transactionId;
    }

    const loan = await deps.loanRepo.updateLoan(id, {
      ...input,
      wallet_id: walletId,
      skip_transaction: willSkip,
      linked_transaction_id: linkedTransactionId,
      updated_at: now,
    });

    if (!loan) throw new Error('Failed to update loan');
    return loan;
  });
}
