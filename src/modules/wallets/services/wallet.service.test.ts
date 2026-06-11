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
  let dbQuery: ReturnType<typeof vi.fn>;
  let dbRun: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    dbQuery = vi.fn();
    dbRun = vi.fn();
    vi.mocked(getDbConnectionForTransaction).mockResolvedValue({
      query: dbQuery,
      run: dbRun,
    });
  });

  it('creates the adjustment transaction and updates balance inside the outer transaction', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    const walletRepository = new InMemoryWalletRepository([wallet]);
    const updateSpy = vi.spyOn(walletRepository, 'update');
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
    expect(updateSpy).toHaveBeenCalledWith(wallet.id, {}, expect.any(Number));
    expect(dbQuery).not.toHaveBeenCalled();
    expect(dbRun).toHaveBeenCalledOnce();
    expect(dbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO categories'),
      expect.arrayContaining(['cat-balance-adjustment-expense']),
      true
    );
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

describe('WalletService.deleteWallet reference guard', () => {
  it('checks references inside the transaction and does not delete when a reference appears', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    const walletRepository = new InMemoryWalletRepository([wallet]);
    let insideTransaction = false;
    const getReferenceCounts = vi
      .spyOn(walletRepository, 'getReferenceCounts')
      .mockImplementation(async () => ({
        transactions: insideTransaction ? 1 : 0,
        recurringBills: 0,
        budgets: 0,
        loans: 0,
        loanPayments: 0,
      }));
    const deleteSpy = vi.spyOn(walletRepository, 'delete');
    const runTransaction: TransactionRunner = async (work) => {
      insideTransaction = true;
      try {
        return await work();
      } finally {
        insideTransaction = false;
      }
    };
    const service = new WalletService(walletRepository, transactionRepository, runTransaction);

    await expect(service.deleteWallet(wallet.id)).rejects.toThrow(
      'Cannot delete a wallet that is used by transactions, bills, budgets, or loans.'
    );

    expect(getReferenceCounts).toHaveBeenCalledOnce();
    expect(deleteSpy).not.toHaveBeenCalled();
    await expect(walletRepository.getById(wallet.id)).resolves.toEqual(wallet);
  });

  it('does not delete when a reference appears after a zero reference count', async () => {
    const transactionRepository = new InMemoryTransactionRepository();
    const walletRepository = new InMemoryWalletRepository([wallet]);
    vi.spyOn(walletRepository, 'getReferenceCounts').mockResolvedValue({
      transactions: 0,
      recurringBills: 0,
      budgets: 0,
      loans: 0,
      loanPayments: 0,
    });
    const deleteSpy = vi.spyOn(walletRepository, 'delete').mockImplementation(async () => {
      throw new Error('FOREIGN KEY constraint failed');
    });
    const runTransaction: TransactionRunner = async (work) => work();
    const service = new WalletService(walletRepository, transactionRepository, runTransaction);

    await expect(service.deleteWallet(wallet.id)).rejects.toThrow('FOREIGN KEY constraint failed');

    expect(deleteSpy).toHaveBeenCalledOnce();
    await expect(walletRepository.getById(wallet.id)).resolves.toEqual(wallet);
  });
});
