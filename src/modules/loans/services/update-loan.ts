import type { IWalletRepository } from '@/modules/wallets/repositories/wallet.repository';
import type { Loan, UpdateLoanInput } from '../domain/loan.model';
import { validateUpdateLoan } from '../domain/loan.schema';
import type { ILoanRepository } from '../repositories/loan.repository';

export interface UpdateLoanDeps {
  loanRepo: ILoanRepository;
  walletRepo: IWalletRepository;
}

export async function updateLoan(
  id: string,
  input: UpdateLoanInput,
  deps: UpdateLoanDeps
): Promise<Loan> {
  validateUpdateLoan(input);
  const skipTransaction = input.skip_transaction ?? false;
  const walletId = skipTransaction ? null : input.wallet_id ?? null;

  if (!skipTransaction) {
    if (!walletId) throw new Error('wallet_id is required');

    const wallet = await deps.walletRepo.getById(walletId);
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.is_active !== 1) throw new Error('Wallet is inactive');
  }

  const loan = await deps.loanRepo.updateLoan(id, {
    ...input,
    wallet_id: walletId,
    skip_transaction: skipTransaction,
    updated_at: Date.now(),
  });

  if (!loan) throw new Error('Loan not found');
  return loan;
}
