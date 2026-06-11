import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '@/core/telemetry/logger';
import { immediateTransactionRunner } from '@/core/db/transaction-runner';
import { InMemoryTransactionRepository } from '@/tests/fakes/in-memory-transaction.repository';
import { InMemoryWalletRepository } from '@/tests/fakes/in-memory-wallet.repository';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { DeleteTransactionUseCase } from './delete-transaction';

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const sourceWallet: Wallet = {
  id: 'w-source',
  name: 'Source',
  currency: 'VND',
  balance: 7_500,
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

const destinationWallet: Wallet = {
  ...sourceWallet,
  id: 'w-destination',
  name: 'Destination',
  balance: 3_500,
  sort_order: 1,
};

const transfer = {
  id: 'tx-transfer',
  wallet_id: sourceWallet.id,
  to_wallet_id: destinationWallet.id,
  category_id: 'cat-transfer',
  type: 'transfer' as const,
  amount: 2_500,
  note: null,
  receipt_path: null,
  transaction_date: 1_000,
  created_at: 1_000,
  updated_at: 1_000,
  deleted_at: null,
};

describe('DeleteTransactionUseCase transfer balance revert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reverts both wallets for a normal transfer delete', async () => {
    const transactionRepository = new InMemoryTransactionRepository([transfer]);
    const walletRepository = new InMemoryWalletRepository([sourceWallet, destinationWallet]);
    const useCase = new DeleteTransactionUseCase(
      transactionRepository,
      walletRepository,
      immediateTransactionRunner
    );

    await expect(useCase.execute(transfer.id)).resolves.toBe(true);

    await expect(walletRepository.getById(sourceWallet.id)).resolves.toMatchObject({ balance: 10_000 });
    await expect(walletRepository.getById(destinationWallet.id)).resolves.toMatchObject({ balance: 1_000 });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('reverts a soft-deleted destination wallet found by include-deleted lookup', async () => {
    const transactionRepository = new InMemoryTransactionRepository([transfer]);
    const walletRepository = new InMemoryWalletRepository([
      sourceWallet,
      { ...destinationWallet, is_active: 0 },
    ]);
    const readStoredWallet = walletRepository.getById.bind(walletRepository);
    vi.spyOn(walletRepository, 'getById').mockImplementation(async (id) => {
      if (id === destinationWallet.id) return null;
      return readStoredWallet(id);
    });
    const includeDeletedSpy = vi
      .spyOn(walletRepository, 'getByIdIncludeDeleted')
      .mockImplementation(readStoredWallet);
    const useCase = new DeleteTransactionUseCase(
      transactionRepository,
      walletRepository,
      immediateTransactionRunner
    );

    await expect(useCase.execute(transfer.id)).resolves.toBe(true);

    expect(includeDeletedSpy).toHaveBeenCalledWith(destinationWallet.id);
    await expect(walletRepository.getByIdIncludeDeleted(destinationWallet.id)).resolves.toMatchObject({
      balance: 1_000,
      is_active: 0,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('soft-deletes and warns when the destination wallet is fully missing', async () => {
    const transactionRepository = new InMemoryTransactionRepository([transfer]);
    const walletRepository = new InMemoryWalletRepository([sourceWallet]);
    const useCase = new DeleteTransactionUseCase(
      transactionRepository,
      walletRepository,
      immediateTransactionRunner
    );

    await expect(useCase.execute(transfer.id)).resolves.toBe(true);

    await expect(walletRepository.getById(sourceWallet.id)).resolves.toMatchObject({ balance: 10_000 });
    await expect(transactionRepository.getById(transfer.id)).resolves.toBeNull();
    await expect(transactionRepository.getByIdIncludeDeleted(transfer.id)).resolves.toMatchObject({
      deleted_at: expect.any(Number),
    });
    expect(logger.warn).toHaveBeenCalledWith(
      `Cannot revert deleted transfer ${transfer.id}: destination wallet ${destinationWallet.id} no longer exists`
    );
  });
});
