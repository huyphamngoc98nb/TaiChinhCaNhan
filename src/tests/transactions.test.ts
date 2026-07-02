import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteTransactionRepository } from '../modules/transactions/repositories/sqlite-transaction.repository';
import { CreateTransactionUseCase } from '../modules/transactions/services/create-transaction';
import { UpdateTransactionUseCase } from '../modules/transactions/services/update-transaction';
import { DeleteTransactionUseCase } from '../modules/transactions/services/delete-transaction';
import { CreateCreditCardPaymentUseCase } from '../modules/transactions/services/create-credit-card-payment';
import { WalletService } from '@/modules/wallets/services/wallet.service';
import { TransactionValidationError } from '../modules/transactions/domain/transaction.schema';
import * as connection from '../core/db/sqlite/connection';
import { immediateTransactionRunner } from '@/core/db/transaction-runner';
import { InMemoryTransactionRepository } from './fakes/in-memory-transaction.repository';
import { InMemoryWalletRepository } from './fakes/in-memory-wallet.repository';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { SyncCreditCardStatementUseCase } from '@/modules/wallets/services/sync-credit-card-statement';
import { sqlite } from '@/core/db/sqlite/pragmas';

// Mock dependencies
vi.mock('../core/db/sqlite/connection', () => ({
  DB_NAME: 'test_db',
  getDbConnection: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web' },
}));

vi.mock('@/core/db/sqlite/pragmas', () => ({
  sqlite: { saveToStore: vi.fn() },
}));

describe('Transaction Module QA Tests', () => {
  let mockDb: any;
  let repository: SQLiteTransactionRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      run: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
      query: vi.fn().mockResolvedValue({ values: [] }),
    };
    vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb);
    
    repository = new SQLiteTransactionRepository();
  });

  const walletRow = {
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
  } satisfies Wallet;

  describe('Repository Layer', () => {
    it('create() inserts correct values and returns them without a DB read-back', async () => {
      const input = {
        id: 'tx-1',
        wallet_id: 'w-1',
        category_id: 'c-1',
        type: 'expense' as const,
        amount: 100,
        transaction_date: 1000,
        created_at: 2000,
        updated_at: 2000
      };

      const transaction = await repository.create(input);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        [
          'tx-1', 'w-1', 'c-1', 'expense', 100, null, null,
          1000, 0, 0, null, null, null, null, 2000, 2000,
        ],
        true
      );
      expect(transaction).toEqual({
        ...input,
        note: null,
        to_wallet_id: null,
        exclude_from_total: false,
        is_budget_offset: false,
        offset_budget_id: null,
        source_type: null,
        source_id: null,
        source_event: null,
        deleted_at: null,
      });
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('list() builds correct WHERE clause for filters', async () => {
      await repository.list({
        type: 'income',
        wallet_id: 'w-1',
        startDate: 1000,
        endDate: 2000,
        note: '  cà phê  ',
      });
      
      const [sql, values] = mockDb.query.mock.calls[0];
      expect(sql).toContain('AND t.type = ?');
      expect(sql).toContain('AND t.wallet_id = ?');
      expect(sql).toContain('AND t.transaction_date >= ?');
      expect(sql).toContain('AND t.transaction_date <= ?');
      expect(sql).toContain('AND t.note LIKE ?');
      expect(sql).toContain('AND t.deleted_at IS NULL'); // Default behavior
      expect(values).toEqual(['w-1', 'income', 1000, 2000, '%cà phê%']);
      expect(sql).not.toContain('cà phê');
    });

    it('list() ignores an empty note filter', async () => {
      await repository.list({ note: '   ' });

      const [sql, values] = mockDb.query.mock.calls[0];
      expect(sql).not.toContain('AND t.note LIKE ?');
      expect(values).toEqual([]);
    });

    it('softDelete() updates deleted_at column', async () => {
      await repository.softDelete('tx-1', 5000);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?'),
        [5000, 5000, 'tx-1'],
        true
      );
    });
  });

  describe('Service Layer (Use Cases)', () => {
    const validCreateInput = {
      wallet_id: 'w-1',
      category_id: 'c-1',
      type: 'expense' as const,
      amount: 50,
      transaction_date: Date.now(),
      exclude_from_total: false,
    };
    const destinationWallet = {
      ...walletRow,
      id: 'w-2',
      name: 'Bank',
      balance: 1_000,
    } satisfies Wallet;
    const creditCardWallet = {
      ...walletRow,
      id: 'cc-1',
      name: 'Visa',
      balance: 0,
      account_type: 'credit_card' as const,
      credit_limit: 5_000,
      statement_day: 15,
      due_day: 5,
    } satisfies Wallet;

    function queuedTransactionRunner() {
      let queue: Promise<void> = Promise.resolve();

      return async <T>(work: () => Promise<T>): Promise<T> => {
        const previous = queue;
        let release = () => {};
        const lock = new Promise<void>((resolve) => {
          release = resolve;
        });

        queue = previous.catch(() => undefined).then(() => lock);
        await previous.catch(() => undefined);

        try {
          return await work();
        } finally {
          release();
        }
      };
    }

    function transactionRunnerWithBeforeWork(beforeWork: () => Promise<void>) {
      let hasRun = false;

      return async <T>(work: () => Promise<T>): Promise<T> => {
        if (!hasRun) {
          hasRun = true;
          await beforeWork();
        }

        return work();
      };
    }

    it('CreateTransactionUseCase validates input before executing', async () => {
      const transactionRepository = new InMemoryTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([walletRow]);
      const createUseCase = new CreateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );
      const invalidInput = { ...validCreateInput, amount: -10 };
      await expect(createUseCase.execute(invalidInput)).rejects.toThrow(TransactionValidationError);
      expect(mockDb.run).not.toHaveBeenCalled();
    });

    it('UpdateTransactionUseCase syncs a credit card with the final transaction date after web persistence', async () => {
      const transactionDate = Date.now();
      const finalTransactionDate = transactionDate + 1_000;
      const oldTx = {
        ...validCreateInput,
        id: 'tx-credit-card',
        wallet_id: 'cc-1',
        amount: 100,
        transaction_date: transactionDate,
        note: null,
        to_wallet_id: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      };
      const transactionRepository = new InMemoryTransactionRepository([oldTx]);
      const walletRepository = new InMemoryWalletRepository([
        { ...creditCardWallet, balance: -100 },
      ]);
      const updateUseCase = new UpdateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );
      const callOrder: string[] = [];
      vi.mocked(sqlite.saveToStore).mockImplementationOnce(async () => {
        callOrder.push('saveToStore');
      });
      const syncSpy = vi
        .spyOn(SyncCreditCardStatementUseCase.prototype, 'execute')
        .mockImplementationOnce(async () => {
          callOrder.push('sync');
        });

      await expect(updateUseCase.execute('tx-credit-card', {
        amount: 150,
        transaction_date: finalTransactionDate,
      })).resolves.toMatchObject({ amount: 150, transaction_date: finalTransactionDate });

      expect(syncSpy).toHaveBeenCalledOnce();
      expect(syncSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cc-1', account_type: 'credit_card' }),
        finalTransactionDate
      );
      expect(callOrder).toEqual(['saveToStore', 'sync']);
      syncSpy.mockRestore();
    });

    it('UpdateTransactionUseCase ignores statement sync failure and skips non-credit-card wallets', async () => {
      const creditCardTx = {
        ...validCreateInput,
        id: 'tx-credit-card',
        wallet_id: 'cc-1',
        note: null,
        to_wallet_id: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      };
      const cashTx = { ...creditCardTx, id: 'tx-cash', wallet_id: 'w-1' };
      const transactionRepository = new InMemoryTransactionRepository([creditCardTx, cashTx]);
      const walletRepository = new InMemoryWalletRepository([
        walletRow,
        { ...creditCardWallet, balance: -50 },
      ]);
      const updateUseCase = new UpdateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const syncSpy = vi
        .spyOn(SyncCreditCardStatementUseCase.prototype, 'execute')
        .mockRejectedValue(new Error('sync failed'));

      await expect(updateUseCase.execute('tx-credit-card', { amount: 60 })).resolves.toMatchObject({
        amount: 60,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to sync credit card statement for wallet cc-1',
        expect.any(Error)
      );

      syncSpy.mockClear();
      await expect(updateUseCase.execute('tx-cash', { amount: 60 })).resolves.toMatchObject({
        amount: 60,
      });
      expect(syncSpy).not.toHaveBeenCalled();
      syncSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('UpdateTransactionUseCase validates expense edits against the new wallet when wallet changes', async () => {
      const oldTx = {
        ...validCreateInput,
        id: 'tx-1',
        type: 'expense' as const,
        amount: 5_400_000,
        note: null,
        to_wallet_id: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      };
      const newWallet = {
        ...walletRow,
        id: 'w-2',
        name: 'Bank',
        balance: 10_000_000,
      } satisfies Wallet;
      const transactionRepository = new InMemoryTransactionRepository([oldTx]);
      const walletRepository = new InMemoryWalletRepository([
        { ...walletRow, balance: -5_400_000 },
        newWallet,
      ]);
      const updateUseCase = new UpdateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );

      await updateUseCase.execute('tx-1', { wallet_id: 'w-2', amount: 5_400_000 });

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 0 });
      await expect(walletRepository.getById('w-2')).resolves.toMatchObject({ balance: 4_600_000 });
      await expect(transactionRepository.getById('tx-1')).resolves.toMatchObject({
        wallet_id: 'w-2',
        amount: 5_400_000,
      });
    });

    it('UpdateTransactionUseCase rechecks balance when increasing an expense amount', async () => {
      const oldTx = {
        ...validCreateInput,
        id: 'tx-1',
        type: 'expense' as const,
        amount: 20,
        note: null,
        to_wallet_id: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      };
      const transactionRepository = new InMemoryTransactionRepository([oldTx]);
      const walletRepository = new InMemoryWalletRepository([{ ...walletRow, balance: 80 }]);
      const updateUseCase = new UpdateTransactionUseCase(
        transactionRepository,
        walletRepository,
        transactionRunnerWithBeforeWork(() => walletRepository.updateBalanceDelta('w-1', -40, Date.now()))
      );

      await expect(updateUseCase.execute('tx-1', { amount: 70 })).rejects.toThrow(TransactionValidationError);

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 40 });
      await expect(transactionRepository.getById('tx-1')).resolves.toMatchObject({ amount: 20 });
    });

    it('UpdateTransactionUseCase rechecks the new source wallet when changing wallet', async () => {
      const oldTx = {
        ...validCreateInput,
        id: 'tx-1',
        type: 'expense' as const,
        amount: 20,
        note: null,
        to_wallet_id: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      };
      const transactionRepository = new InMemoryTransactionRepository([oldTx]);
      const walletRepository = new InMemoryWalletRepository([
        { ...walletRow, balance: 80 },
        { ...destinationWallet, balance: 100 },
      ]);
      const updateUseCase = new UpdateTransactionUseCase(
        transactionRepository,
        walletRepository,
        transactionRunnerWithBeforeWork(() => walletRepository.updateBalanceDelta('w-2', -80, Date.now()))
      );

      await expect(updateUseCase.execute('tx-1', { wallet_id: 'w-2', amount: 50 })).rejects.toThrow(TransactionValidationError);

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 80 });
      await expect(walletRepository.getById('w-2')).resolves.toMatchObject({ balance: 20 });
      await expect(transactionRepository.getById('tx-1')).resolves.toMatchObject({ wallet_id: 'w-1', amount: 20 });
    });

    it('UpdateTransactionUseCase rechecks source balance when changing to transfer', async () => {
      const oldTx = {
        ...validCreateInput,
        id: 'tx-1',
        type: 'expense' as const,
        amount: 20,
        note: null,
        to_wallet_id: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      };
      const transactionRepository = new InMemoryTransactionRepository([oldTx]);
      const walletRepository = new InMemoryWalletRepository([
        { ...walletRow, balance: 80 },
        destinationWallet,
      ]);
      const updateUseCase = new UpdateTransactionUseCase(
        transactionRepository,
        walletRepository,
        transactionRunnerWithBeforeWork(() => walletRepository.updateBalanceDelta('w-1', -60, Date.now()))
      );

      await expect(updateUseCase.execute('tx-1', {
        type: 'transfer',
        amount: 50,
        to_wallet_id: 'w-2',
      })).rejects.toThrow(TransactionValidationError);

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 20 });
      await expect(walletRepository.getById('w-2')).resolves.toMatchObject({ balance: 1_000 });
      await expect(transactionRepository.getById('tx-1')).resolves.toMatchObject({ type: 'expense', to_wallet_id: null });
    });

    it('UpdateTransactionUseCase rechecks credit card limit with current liability', async () => {
      const oldTx = {
        ...validCreateInput,
        id: 'tx-1',
        wallet_id: 'cc-1',
        type: 'expense' as const,
        amount: 100,
        note: null,
        to_wallet_id: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      };
      const transactionRepository = new InMemoryTransactionRepository([oldTx]);
      const walletRepository = new InMemoryWalletRepository([
        { ...creditCardWallet, balance: -100, credit_limit: 200 },
      ]);
      const updateUseCase = new UpdateTransactionUseCase(
        transactionRepository,
        walletRepository,
        transactionRunnerWithBeforeWork(() => walletRepository.updateBalanceDelta('cc-1', -50, Date.now()))
      );

      await expect(updateUseCase.execute('tx-1', { amount: 180 })).rejects.toThrow(TransactionValidationError);

      await expect(walletRepository.getById('cc-1')).resolves.toMatchObject({ balance: -150 });
      await expect(transactionRepository.getById('tx-1')).resolves.toMatchObject({ amount: 100 });
    });

    it('CreateTransactionUseCase moves balance between wallets for transfers', async () => {
      const transactionRepository = new InMemoryTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([walletRow, destinationWallet]);
      const createUseCase = new CreateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );

      const tx = await createUseCase.execute({
        ...validCreateInput,
        type: 'transfer',
        amount: 2_500,
        to_wallet_id: 'w-2',
      });

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 7_500 });
      await expect(walletRepository.getById('w-2')).resolves.toMatchObject({ balance: 3_500 });
      expect(tx.to_wallet_id).toBe('w-2');
    });

    it('creating an expense on a cash wallet reduces cash balance', async () => {
      const transactionRepository = new InMemoryTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([walletRow]);
      const createUseCase = new CreateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );

      await createUseCase.execute(validCreateInput);

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 9_950 });
    });

    it('rechecks wallet balance inside serialized create transaction work', async () => {
      const transactionRepository = new InMemoryTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([
        { ...walletRow, balance: 100 },
      ]);
      const createUseCase = new CreateTransactionUseCase(
        transactionRepository,
        walletRepository,
        queuedTransactionRunner()
      );
      const input = {
        ...validCreateInput,
        amount: 60,
      };

      const results = await Promise.allSettled([
        createUseCase.execute(input),
        createUseCase.execute({
          ...input,
          transaction_date: input.transaction_date + 1,
        }),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((result) => result.status === 'rejected');
      expect(rejected?.status).toBe('rejected');
      if (rejected?.status !== 'rejected') throw new Error('Expected one rejected transaction');
      expect(rejected.reason).toBeInstanceOf(TransactionValidationError);
      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 40 });
      await expect(transactionRepository.list({ wallet_id: 'w-1' })).resolves.toHaveLength(1);
    });

    it('creating an expense on a credit card increases liability without touching cash', async () => {
      const transactionRepository = new InMemoryTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([walletRow, creditCardWallet]);
      const createUseCase = new CreateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );

      await createUseCase.execute({
        ...validCreateInput,
        wallet_id: 'cc-1',
        amount: 250,
      });

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 10_000 });
      await expect(walletRepository.getById('cc-1')).resolves.toMatchObject({ balance: -250 });
    });

    it('credit card payment reduces source balance and card liability as a transfer', async () => {
      const transactionRepository = new InMemoryTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([
        walletRow,
        { ...creditCardWallet, balance: -1_200 },
      ]);
      const createUseCase = new CreateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );
      const paymentUseCase = new CreateCreditCardPaymentUseCase(createUseCase, walletRepository);

      const tx = await paymentUseCase.execute({
        from_wallet_id: 'w-1',
        credit_card_wallet_id: 'cc-1',
        category_id: 'cat-transfer',
        amount: 700,
        transaction_date: Date.now(),
      });

      expect(tx.type).toBe('transfer');
      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 9_300 });
      await expect(walletRepository.getById('cc-1')).resolves.toMatchObject({ balance: -500 });
    });

    it('blocks credit card payments when the source wallet has insufficient balance', async () => {
      const transactionRepository = new InMemoryTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([
        { ...walletRow, balance: 100 },
        { ...creditCardWallet, balance: -1_200 },
      ]);
      const createUseCase = new CreateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );
      const paymentUseCase = new CreateCreditCardPaymentUseCase(createUseCase, walletRepository);

      await expect(paymentUseCase.execute({
        from_wallet_id: 'w-1',
        credit_card_wallet_id: 'cc-1',
        category_id: 'cat-transfer',
        amount: 700,
        transaction_date: Date.now(),
      })).rejects.toThrow(TransactionValidationError);
    });

    it('rejects card-payment flow when target wallet is not a credit card', async () => {
      const transactionRepository = new InMemoryTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([walletRow, destinationWallet]);
      const createUseCase = new CreateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );
      const paymentUseCase = new CreateCreditCardPaymentUseCase(createUseCase, walletRepository);

      await expect(paymentUseCase.execute({
        from_wallet_id: 'w-1',
        credit_card_wallet_id: 'w-2',
        category_id: 'cat-transfer',
        amount: 100,
        transaction_date: Date.now(),
      })).rejects.toThrow(TransactionValidationError);
    });

    it('DeleteTransactionUseCase reverts both wallets for transfers', async () => {
      const transactionRepository = new InMemoryTransactionRepository([{
        ...validCreateInput,
        id: 'tx-transfer',
        type: 'transfer',
        amount: 2_500,
        to_wallet_id: 'w-2',
        note: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      }]);
      const walletRepository = new InMemoryWalletRepository([
        { ...walletRow, balance: 7_500 },
        { ...destinationWallet, balance: 3_500 },
      ]);
      const deleteUseCase = new DeleteTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );

      await deleteUseCase.execute('tx-transfer');

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 10_000 });
      await expect(walletRepository.getById('w-2')).resolves.toMatchObject({ balance: 1_000 });
    });

    it('DeleteTransactionUseCase soft-deletes transfer when destination wallet is missing', async () => {
      const transactionRepository = new InMemoryTransactionRepository([{
        ...validCreateInput,
        id: 'tx-transfer-missing-destination',
        type: 'transfer',
        amount: 2_500,
        to_wallet_id: 'w-2',
        note: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      }]);
      const walletRepository = new InMemoryWalletRepository([
        { ...walletRow, balance: 7_500 },
      ]);
      const deleteUseCase = new DeleteTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );

      await expect(deleteUseCase.execute('tx-transfer-missing-destination')).resolves.toBe(true);

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 10_000 });
      await expect(walletRepository.getById('w-2')).resolves.toBeNull();
      await expect(transactionRepository.getById('tx-transfer-missing-destination')).resolves.toBeNull();
      await expect(transactionRepository.getByIdIncludeDeleted('tx-transfer-missing-destination')).resolves.toMatchObject({
        deleted_at: expect.any(Number),
      });

      await expect(deleteUseCase.execute('tx-transfer-missing-destination')).resolves.toBe(true);
      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 10_000 });
    });

    it('DeleteTransactionUseCase syncs a credit card after commit and ignores sync failure', async () => {
      const transactionDate = Date.now();
      const transactionRepository = new InMemoryTransactionRepository([{
        ...validCreateInput,
        id: 'tx-credit-card-expense',
        wallet_id: 'cc-1',
        amount: 50,
        transaction_date: transactionDate,
        note: null,
        to_wallet_id: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      }]);
      const walletRepository = new InMemoryWalletRepository([
        { ...creditCardWallet, balance: -50 },
      ]);
      const deleteUseCase = new DeleteTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const syncSpy = vi
        .spyOn(SyncCreditCardStatementUseCase.prototype, 'execute')
        .mockRejectedValue(new Error('sync failed'));

      await expect(deleteUseCase.execute('tx-credit-card-expense')).resolves.toBe(true);

      expect(syncSpy).toHaveBeenCalledOnce();
      expect(syncSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cc-1', account_type: 'credit_card' }),
        transactionDate
      );
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to sync credit card statement for wallet cc-1',
        expect.any(Error)
      );
      syncSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('WalletService calculates balance adjustment from the wallet state inside the transaction', async () => {
      const transactionRepository = new InMemoryTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([walletRow]);
      const walletService = new WalletService(
        walletRepository,
        transactionRepository,
        transactionRunnerWithBeforeWork(() => walletRepository.updateBalanceDelta('w-1', 2_000, Date.now()))
      );
      mockDb.query.mockResolvedValueOnce({ values: [] });

      await walletService.updateWallet('w-1', { balance: 7_500 });

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 7_500 });
      const transactions = await transactionRepository.list({ wallet_id: 'w-1' });
      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({
        type: 'expense',
        amount: 4_500,
        exclude_from_total: true,
        note: 'Cân bằng số dư',
      });
    });

    it('WalletService records a balance adjustment transaction when editing wallet balance', async () => {
      const transactionRepository = new InMemoryTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([walletRow]);
      const walletService = new WalletService(
        walletRepository,
        transactionRepository,
        immediateTransactionRunner
      );
      mockDb.query.mockResolvedValueOnce({ values: [] });

      await walletService.updateWallet('w-1', { balance: 7_500 });

      await expect(walletRepository.getById('w-1')).resolves.toMatchObject({ balance: 7_500 });
      const transactions = await transactionRepository.list({ wallet_id: 'w-1' });
      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toMatchObject({
        wallet_id: 'w-1',
        category_id: 'cat-balance-adjustment-expense',
        type: 'expense',
        amount: 2_500,
        exclude_from_total: true,
        note: 'Cân bằng số dư',
      });
    });
  });
});
