import { beforeEach, describe, expect, it, vi } from 'vitest';
import { immediateTransactionRunner } from '@/core/db/transaction-runner';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { InMemoryTransactionRepository } from '@/tests/fakes/in-memory-transaction.repository';
import { InMemoryWalletRepository } from '@/tests/fakes/in-memory-wallet.repository';
import { CreateTransactionUseCase } from './create-transaction';

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
}));

vi.mock('@/core/db/sqlite/transaction', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/core/db/sqlite/transaction')>();
  return { ...original, getDbConnectionForTransaction: vi.fn() };
});

vi.mock('@/core/db/sqlite/connection', () => ({ DB_NAME: 'test_db' }));

const wallet: Wallet = {
  id: 'wallet-1',
  name: 'Cash',
  currency: 'VND',
  balance: 100_000,
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

describe('CreateTransactionUseCase - exclude_from_total', () => {
  let txRepo: InMemoryTransactionRepository;
  let walletRepo: InMemoryWalletRepository;
  let useCase: CreateTransactionUseCase;

  beforeEach(() => {
    txRepo = new InMemoryTransactionRepository();
    walletRepo = new InMemoryWalletRepository([{ ...wallet }]);
    useCase = new CreateTransactionUseCase(txRepo, walletRepo, immediateTransactionRunner);
  });

  it('persists exclude_from_total = true on the saved transaction', async () => {
    await useCase.execute({
      wallet_id: 'wallet-1',
      category_id: 'cat-1',
      type: 'expense',
      amount: 50_000,
      transaction_date: Date.now(),
      exclude_from_total: true,
    });

    const saved = await txRepo.list({ wallet_id: 'wallet-1' });
    expect(saved[0].exclude_from_total).toBe(true);
  });

  it('still deducts wallet balance when exclude_from_total = true', async () => {
    await useCase.execute({
      wallet_id: 'wallet-1',
      category_id: 'cat-1',
      type: 'expense',
      amount: 30_000,
      transaction_date: Date.now(),
      exclude_from_total: true,
    });

    const updatedWallet = await walletRepo.getById('wallet-1');
    expect(updatedWallet?.balance).toBe(70_000);
  });

  it('still adds to wallet balance for income when exclude_from_total = true', async () => {
    await useCase.execute({
      wallet_id: 'wallet-1',
      category_id: 'cat-income',
      type: 'income',
      amount: 20_000,
      transaction_date: Date.now(),
      exclude_from_total: true,
    });

    const updatedWallet = await walletRepo.getById('wallet-1');
    expect(updatedWallet?.balance).toBe(120_000);
  });

  it('defaults exclude_from_total to false when not provided', async () => {
    await useCase.execute({
      wallet_id: 'wallet-1',
      category_id: 'cat-1',
      type: 'expense',
      amount: 10_000,
      transaction_date: Date.now(),
    });

    const saved = await txRepo.list({ wallet_id: 'wallet-1' });
    expect(saved[0].exclude_from_total).toBe(false);
  });

  it('preserves and updates exclude_from_total through the in-memory repository', async () => {
    await useCase.execute({
      wallet_id: 'wallet-1',
      category_id: 'cat-1',
      type: 'expense',
      amount: 10_000,
      transaction_date: Date.now(),
      exclude_from_total: true,
    });

    const [saved] = await txRepo.list({ wallet_id: 'wallet-1' });
    const preserved = await txRepo.update(saved.id, { updated_at: Date.now() });
    const updated = await txRepo.update(saved.id, {
      exclude_from_total: false,
      updated_at: Date.now(),
    });

    expect(preserved?.exclude_from_total).toBe(true);
    expect(updated?.exclude_from_total).toBe(false);
  });
});
