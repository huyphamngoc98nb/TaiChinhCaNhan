import { sqliteTransactionRunner as runInTransaction } from '@/core/db/transaction-runner';
import { generateUUID } from '@/shared/utils/generate-uuid';
import type { CategoryType } from '@/modules/categories/domain/category.model';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import { getSourceDelta } from '@/modules/transactions/services/transaction-wallet-rules';
import type { IWalletRepository } from '@/modules/wallets/repositories/wallet.repository';
import type { CreateLoanPaymentInput, LoanPayment, LoanType } from '../domain/loan.model';
import { validateCreateLoanPayment } from '../domain/loan.schema';
import type { ILoanRepository } from '../repositories/loan.repository';
import type { LoanCategoryRepository } from './create-loan';
import { resolveLoanCategoryId } from './create-loan';
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

export class LoanPaymentExceedError extends Error {
  constructor() {
    super(defaultText('loans.errors.paymentExceedsRemaining'));
    this.name = 'LoanPaymentExceedError';
  }
}

export interface AddLoanPaymentDeps {
  loanRepo: ILoanRepository;
  transactionRepo: ITransactionRepository;
  walletRepo: IWalletRepository;
  categoryRepo: LoanCategoryRepository;
}

const PAYMENT_CATEGORY: Record<LoanType, { slug: 'thu_no' | 'tra_no'; type: CategoryType }> = {
  lend: { slug: 'thu_no', type: 'income' },
  borrow: { slug: 'tra_no', type: 'expense' },
};

export async function addLoanPayment(
  input: CreateLoanPaymentInput,
  deps: AddLoanPaymentDeps
): Promise<LoanPayment> {
  validateCreateLoanPayment(input);

  const loan = await deps.loanRepo.getLoanById(input.loan_id);
  if (!loan) throw new Error(defaultText('loans.errors.notFound'));
  if (loan.status === 'settled' || loan.status === 'cancelled') {
    throw new Error(defaultText('loans.errors.inactive'));
  }

  const categoryConfig = PAYMENT_CATEGORY[loan.type];
  const categoryId = await resolveLoanCategoryId(
    deps.categoryRepo,
    categoryConfig.slug,
    categoryConfig.type
  );

  const now = Date.now();
  const paymentId = generateUUID();
  const transactionId = generateUUID();

  return runInTransaction(async () => {
    const paymentWallet = await deps.walletRepo.getById(input.wallet_id);
    if (!paymentWallet) throw new Error(defaultText('loans.errors.walletNotFound'));
    if (paymentWallet.is_active !== 1) throw new Error(defaultText('loans.errors.walletInactive'));

    const currentPaid = await deps.loanRepo.getTotalPaid(input.loan_id);
    const remaining = Math.max(0, loan.principal - currentPaid);
    if (input.amount > remaining) {
      throw new LoanPaymentExceedError();
    }

    const payment = await deps.loanRepo.createPayment({
      ...input,
      id: paymentId,
      created_at: now,
    });

    const transactionType = loan.type === 'lend' ? 'income' : 'expense';
    const transactionNote = input.note ?? (
      loan.type === 'lend'
        ? defaultText('loans.errors.collectDebtNote').replace('{name}', loan.contact_name)
        : defaultText('loans.errors.repayDebtNote').replace('{name}', loan.contact_name)
    );

    await deps.transactionRepo.create({
      id: transactionId,
      wallet_id: input.wallet_id,
      category_id: categoryId,
      type: transactionType,
      amount: input.amount,
      note: transactionNote,
      transaction_date: input.payment_date,
      created_at: now,
      updated_at: now,
    });

    // Payment transactions also bypass CreateTransactionUseCase, so apply the
    // same cached-balance delta in the surrounding database transaction.
    await deps.walletRepo.updateBalanceDelta(
      paymentWallet.id,
      getSourceDelta(transactionType, input.amount),
      now
    );

    const newTotalPaid = currentPaid + input.amount;
    if (newTotalPaid >= loan.principal) {
      await deps.loanRepo.updateLoanStatus(loan.id, 'settled', now);
    }

    return payment;
  });
}
