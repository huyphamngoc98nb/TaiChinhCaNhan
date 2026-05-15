import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteTransactionRepository } from '../modules/transactions/repositories/sqlite-transaction.repository';
import { CreateTransactionUseCase } from '../modules/transactions/services/create-transaction';
import { UpdateTransactionUseCase } from '../modules/transactions/services/update-transaction';
import { TransactionValidationError } from '../modules/transactions/domain/transaction.schema';
import { ReceiptStorageService } from '../core/files/receipt-storage';
import * as connection from '../core/db/sqlite/connection';
import { immediateTransactionRunner } from '@/core/db/transaction-runner';
import { InMemoryTransactionRepository } from './fakes/in-memory-transaction.repository';
import { InMemoryWalletRepository } from './fakes/in-memory-wallet.repository';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';

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

vi.mock('../core/files/receipt-storage', () => ({
  ReceiptStorageService: {
    saveReceipt: vi.fn(),
    deleteReceipt: vi.fn(),
  }
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  }
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
    created_at: 0,
    updated_at: 0,
  } satisfies Wallet;

  describe('Repository Layer', () => {
    it('create() inserts correct values and maps note/receipt to null if empty', async () => {
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

      // Mock getById which is called after create
      mockDb.query.mockResolvedValueOnce({ values: [{ ...input, note: null, receipt_path: null, deleted_at: null }] });

      await repository.create(input);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        ['tx-1', 'w-1', 'c-1', 'expense', 100, null, null, 1000, 2000, 2000]
      );
    });

    it('list() builds correct WHERE clause for filters', async () => {
      await repository.list({ type: 'income', wallet_id: 'w-1' });
      
      const [sql, values] = mockDb.query.mock.calls[0];
      expect(sql).toContain('AND t.type = ?');
      expect(sql).toContain('AND t.wallet_id = ?');
      expect(sql).toContain('AND t.deleted_at IS NULL'); // Default behavior
      expect(values).toContain('income');
      expect(values).toContain('w-1');
    });

    it('softDelete() updates deleted_at column', async () => {
      await repository.softDelete('tx-1', 5000);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?'),
        [5000, 5000, 'tx-1']
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
    };

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

    it('CreateTransactionUseCase cleans up receipt file if DB insert fails', async () => {
      class FailingTransactionRepository extends InMemoryTransactionRepository {
        override async create(): Promise<never> {
          throw new Error('DB Error');
        }
      }

      const transactionRepository = new FailingTransactionRepository();
      const walletRepository = new InMemoryWalletRepository([walletRow]);
      const createUseCase = new CreateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );

      vi.mocked(ReceiptStorageService.saveReceipt).mockResolvedValue('path/to/receipt.jpg');

      await expect(createUseCase.execute(validCreateInput, 'base64data')).rejects.toThrow('DB Error');
      
      expect(ReceiptStorageService.saveReceipt).toHaveBeenCalledWith('base64data');
      expect(ReceiptStorageService.deleteReceipt).toHaveBeenCalledWith('path/to/receipt.jpg');
    });

    it('UpdateTransactionUseCase deletes old receipt if new one is successfully saved', async () => {
      const oldTx = {
        ...validCreateInput,
        id: 'tx-1',
        note: null,
        receipt_path: 'old.jpg',
        to_wallet_id: null,
        created_at: 0,
        updated_at: 0,
        deleted_at: null,
      };
      const transactionRepository = new InMemoryTransactionRepository([oldTx]);
      const walletRepository = new InMemoryWalletRepository([walletRow]);
      const updateUseCase = new UpdateTransactionUseCase(
        transactionRepository,
        walletRepository,
        immediateTransactionRunner
      );

      vi.mocked(ReceiptStorageService.saveReceipt).mockResolvedValue('new.jpg');

      await updateUseCase.execute('tx-1', { amount: 60 }, 'newBase64');

      expect(ReceiptStorageService.deleteReceipt).toHaveBeenCalledWith('old.jpg');
    });
  });
});
