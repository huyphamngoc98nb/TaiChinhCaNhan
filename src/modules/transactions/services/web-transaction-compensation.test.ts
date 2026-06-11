import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInTransaction } from '@/core/db/sqlite/transaction';
import { InMemoryTransactionRepository } from '@/tests/fakes/in-memory-transaction.repository';
import { InMemoryWalletRepository } from '@/tests/fakes/in-memory-wallet.repository';
import { CreateTransactionUseCase } from './create-transaction';

vi.mock('@/core/db/sqlite/connection', () => ({
  DB_NAME: 'test_db',
  getDbConnection: vi.fn().mockResolvedValue({}),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web' },
}));

vi.mock('@/core/db/sqlite/pragmas', () => ({
  sqlite: { saveToStore: vi.fn() },
}));

describe('Web transaction compensation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores wallet balances when work fails after a partial balance update', async () => {
    class FailingWalletRepository extends InMemoryWalletRepository {
      private updateCount = 0;

      override async updateBalanceDelta(id: string, delta: number, updatedAt: number): Promise<void> {
        this.updateCount += 1;
        if (this.updateCount === 2) {
          throw new Error('second wallet update failed');
        }
        await super.updateBalanceDelta(id, delta, updatedAt);
      }
    }

    const transactionRepository = new InMemoryTransactionRepository();
    const walletRepository = new FailingWalletRepository([
      {
        id: 'w-1',
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
      },
      {
        id: 'w-2',
        name: 'Bank',
        currency: 'VND',
        balance: 1_000,
        account_type: 'bank',
        icon: null,
        color: null,
        sort_order: 1,
        is_active: 1,
        exclude_from_total: 0,
        credit_limit: null,
        statement_day: null,
        due_day: null,
        annual_fee: null,
        created_at: 0,
        updated_at: 0,
      },
    ]);
    const createUseCase = new CreateTransactionUseCase(
      transactionRepository,
      walletRepository,
      runInTransaction
    );

    await expect(createUseCase.execute({
      wallet_id: 'w-1',
      to_wallet_id: 'w-2',
      category_id: 'cat-transfer',
      type: 'transfer',
      amount: 2_500,
      transaction_date: Date.now(),
    })).rejects.toThrow('second wallet update failed');

    await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 10_000 });
    await expect(walletRepository.getById('w-2')).resolves.toMatchObject({ balance: 1_000 });
  });
});
