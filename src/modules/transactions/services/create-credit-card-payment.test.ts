import { describe, expect, it, vi } from 'vitest';
import { immediateTransactionRunner, type TransactionRunner } from '@/core/db/transaction-runner';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { InMemoryWalletRepository } from '@/tests/fakes/in-memory-wallet.repository';
import { CreateCreditCardPaymentUseCase } from './create-credit-card-payment';
import type { CreateTransactionUseCase } from './create-transaction';

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
}));

vi.mock('@/modules/wallets/services/sync-credit-card-statement', () => ({
  SyncCreditCardStatementUseCase: class {
    async execute() {}
  },
}));

const sourceWallet: Wallet = {
  id: 'w-source',
  name: 'Source',
  currency: 'VND',
  balance: 10_000,
  account_type: 'cash',
  icon: null,
  color: null,
  sort_order: 0,
  is_active: 1,
  exclude_from_total: 0,
  credit_limit: null,
  statement_day: null,
  due_day: null,
  annual_fee: null,
  created_at: 0,
  updated_at: 0,
};

const creditCardWallet: Wallet = {
  ...sourceWallet,
  id: 'w-credit-card',
  name: 'Credit Card',
  balance: -2_000,
  account_type: 'credit_card',
  sort_order: 1,
};

describe('CreateCreditCardPaymentUseCase', () => {
  it('completes without a nested transaction lock and creates one transaction', async () => {
    const transaction = {
      id: 'tx-payment',
      wallet_id: sourceWallet.id,
      to_wallet_id: creditCardWallet.id,
      category_id: 'cat-transfer',
      type: 'transfer' as const,
      amount: 1_000,
      note: null,
      transaction_date: 1_000,
      created_at: 1_000,
      updated_at: 1_000,
      deleted_at: null,
    };
    const execute = vi.fn().mockResolvedValue(transaction);
    const createTransaction = { execute } as unknown as CreateTransactionUseCase;
    const walletRepository = new InMemoryWalletRepository([sourceWallet, creditCardWallet]);
    const runTransactionSpy = vi.fn();
    const runTransaction: TransactionRunner = async (work) => {
      runTransactionSpy();
      return immediateTransactionRunner(work);
    };
    const useCase = new CreateCreditCardPaymentUseCase(
      createTransaction,
      walletRepository,
      runTransaction
    );

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      useCase.execute({
        from_wallet_id: sourceWallet.id,
        credit_card_wallet_id: creditCardWallet.id,
        category_id: 'cat-transfer',
        amount: 1_000,
        transaction_date: 1_000,
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('credit card payment timed out')), 250);
      }),
    ]).finally(() => {
      if (timeout) clearTimeout(timeout);
    });

    expect(result).toEqual(transaction);
    expect(runTransactionSpy).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
  });
});
