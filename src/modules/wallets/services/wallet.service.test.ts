import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDbConnectionForTransaction } from '@/core/db/sqlite/transaction';
import type { TransactionRunner } from '@/core/db/transaction-runner';
import { InMemoryTransactionRepository } from '@/tests/fakes/in-memory-transaction.repository';
import { InMemoryWalletRepository } from '@/tests/fakes/in-memory-wallet.repository';
import type { Wallet } from '../repositories/wallet.repository';
import { WalletService } from './wallet.service';

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
}));

vi.mock('@/core/db/sqlite/transaction', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/core/db/sqlite/transaction')>();
  return {
    ...original,
    getDbConnectionForTransaction: vi.fn(),
  };
});

const wallet: Wallet = {
  id: 'wallet-1',
  name: 'Cash',
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

describe('WalletService.updateWallet balance adjustment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDbConnectionForTransaction).mockResolvedValue({
      query: vi.fn().mockResolvedValue({ values: [{ id: 'cat-balance-adjustment-expense' }] }),
      run: vi.fn(),
    });
  });

  it('creates the adjustment transaction and updates balance inside the outer transaction', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    const walletRepository = new InMemoryWalletRepository([wallet]);
    let observedInsideTransaction = false;
    const runTransaction: TransactionRunner = async (work) => {
      const result = await work();
      const updatedWallet = await walletRepository.getById(wallet.id);
      const transactions = await transactionRepository.list({ wallet_id: wallet.id });
      observedInsideTransaction =
        updatedWallet?.balance === 7_500 &&
        transactions.length === 1 &&
        transactions[0].amount === 2_500;
      return result;
    };
    const service = new WalletService(
      walletRepository,
      transactionRepository,
      runTransaction
    );

    await expect(service.updateWallet(wallet.id, { balance: 7_500 })).resolves.toMatchObject({
      balance: 7_500,
    });

    expect(observedInsideTransaction).toBe(true);
    await expect(transactionRepository.list({ wallet_id: wallet.id })).resolves.toEqual([
      expect.objectContaining({
        wallet_id: wallet.id,
        category_id: 'cat-balance-adjustment-expense',
        type: 'expense',
        amount: 2_500,
      }),
    ]);
  });
});
