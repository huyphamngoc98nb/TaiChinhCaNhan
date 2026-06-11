import type { CreateTransactionInput, Transaction, TransactionType } from '../domain/transaction.model';
import { TransactionValidationError } from '../domain/transaction.schema';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';

export function getSourceDelta(type: CreateTransactionInput['type'], amount: number): number {
  if (type === 'income') return amount;
  return -amount;
}

export function assertActiveWallet(wallet: Wallet, message: string) {
  if (wallet.is_active !== 1) throw new Error(message);
}

export function assertNoCreditCardToCreditCardTransfer(
  sourceWallet: Wallet,
  destinationWallet: Wallet,
) {
  if (
    destinationWallet.account_type === 'credit_card' &&
    sourceWallet.account_type === 'credit_card'
  ) {
    throw new TransactionValidationError([
      'Credit card payment source must be a cash, bank, or e-wallet account',
    ]);
  }
}

export function assertCreateTransactionFunding(
  wallet: Wallet,
  type: CreateTransactionInput['type'],
  amount: number,
  toWallet?: Wallet,
) {
  const isCreditCardDebit =
    (type === 'expense' || type === 'transfer') && wallet.account_type === 'credit_card';

  if (isCreditCardDebit) {
    if (wallet.credit_limit != null && wallet.credit_limit + wallet.balance < amount) {
      throw new TransactionValidationError([
        `Insufficient credit: available ${wallet.credit_limit + wallet.balance}, required ${amount}`,
      ]);
    }
    return;
  }

  if ((type === 'expense' || type === 'transfer') && wallet.balance < amount) {
    throw new TransactionValidationError([
      `Insufficient balance: available ${wallet.balance}, required ${amount}`,
    ]);
  }

  if (type === 'transfer' && toWallet?.account_type === 'credit_card') {
    // A positive destination delta reduces card debt. Overpayment is allowed,
    // so credit-card destinations require no additional funding validation.
    return;
  }
}

export function buildUpdateTransactionBalanceDeltas(
  oldTransaction: Transaction,
  finalType: TransactionType,
  finalAmount: number,
  finalWalletId: string,
  finalToWalletId: string | null,
): Map<string, number> {
  const balanceDeltas = new Map<string, number>();
  const addDelta = (walletId: string, delta: number) => {
    balanceDeltas.set(walletId, (balanceDeltas.get(walletId) ?? 0) + delta);
  };

  if (oldTransaction.type === 'income') {
    addDelta(oldTransaction.wallet_id, -oldTransaction.amount);
  } else if (oldTransaction.type === 'expense' || oldTransaction.type === 'transfer') {
    addDelta(oldTransaction.wallet_id, oldTransaction.amount);
  }

  if (finalType === 'income') {
    addDelta(finalWalletId, finalAmount);
  } else if (finalType === 'expense' || finalType === 'transfer') {
    addDelta(finalWalletId, -finalAmount);
  }

  if (oldTransaction.type === 'transfer' && oldTransaction.to_wallet_id) {
    addDelta(oldTransaction.to_wallet_id, -oldTransaction.amount);
  }
  if (finalType === 'transfer' && finalToWalletId) {
    addDelta(finalToWalletId, finalAmount);
  }

  return balanceDeltas;
}

export function assertProjectedWalletDelta(wallet: Wallet, walletDelta: number) {
  if (walletDelta === 0) return;
  if (wallet.account_type === 'credit_card' && walletDelta > 0) return;

  const projectedBalance = wallet.balance + walletDelta;
  if (wallet.account_type === 'credit_card') {
    const projectedOutstanding = Math.max(0, -projectedBalance);
    if (wallet.credit_limit != null && projectedOutstanding > wallet.credit_limit) {
      throw new TransactionValidationError([
        `Insufficient credit: available ${wallet.credit_limit + wallet.balance}, required additional ${Math.abs(walletDelta)}`,
      ]);
    }
    return;
  }

  if (projectedBalance < 0) {
    throw new TransactionValidationError([
      `Insufficient balance: current ${wallet.balance}, required additional ${Math.abs(walletDelta)}`,
    ]);
  }
}
