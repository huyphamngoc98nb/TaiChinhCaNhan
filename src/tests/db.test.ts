import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runMigrations } from '../core/db/migrations/migration-runner';
import { runInTransaction } from '../core/db/sqlite/transaction';
import { seedDefaultData } from '../core/db/seed/default-categories';
import { SQLiteTransactionRepository } from '../modules/transactions/repositories/sqlite-transaction.repository';
import { SQLiteWalletRepository } from '../modules/wallets/repositories/sqlite-wallet.repository';
import { SQLiteCategoryRepository } from '../modules/categories/repositories/sqlite-category.repository';
import * as connection from '../core/db/sqlite/connection';

// Mock the DB connection and logger
vi.mock('../core/db/sqlite/connection', () => ({
  DB_NAME: 'test_db',
  getDbConnection: vi.fn(),
  isDatabaseReady: vi.fn(),
  initDatabaseConnection: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }
}));

describe('Database SQLite Tests', () => {
  let mockDb: any;

  function expectExecuteContaining(fragment: string) {
    expect(
      mockDb.execute.mock.calls.some(([sql]: [string]) => sql.includes(fragment))
    ).toBe(true);
  }

  function expectNoExecuteContaining(fragment: string) {
    expect(
      mockDb.execute.mock.calls.some(([sql]: [string]) => sql.includes(fragment))
    ).toBe(false);
  }

  function expectMigrationMarked(version: number, name: string) {
    expect(
      mockDb.run.mock.calls.some(([sql, values]: [string, unknown[]]) =>
        sql.includes('INSERT INTO migrations') &&
        values[0] === version &&
        values[1] === name &&
        typeof values[2] === 'number'
      )
    ).toBe(true);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      execute: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({ values: [] }),
      run: vi.fn().mockResolvedValue(undefined),
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      isTransactionActive: vi.fn().mockResolvedValue({ result: false }),
    };
    vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb);
  });

  // -------------------------------------------------------------------------
  // Migration runner – happy path (all 4 migrations)
  // -------------------------------------------------------------------------
  it('migration runner creates migrations table and runs all migrations in order', async () => {
    await runMigrations();

    // Migrations tracking table
    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS migrations')
    );

    expectExecuteContaining('CREATE TABLE IF NOT EXISTS wallets');
    expectExecuteContaining('CREATE INDEX IF NOT EXISTS idx_transactions_date');
    expectExecuteContaining('ALTER TABLE transactions ADD COLUMN deleted_at');
    expectExecuteContaining('ALTER TABLE transactions ADD COLUMN receipt_path');
    expectExecuteContaining('CREATE TABLE IF NOT EXISTS budgets');
    expectExecuteContaining('ALTER TABLE budgets ADD COLUMN account_type_scope');
    expectExecuteContaining('CREATE TABLE IF NOT EXISTS error_logs');
    expectExecuteContaining('CREATE INDEX IF NOT EXISTS idx_budgets_active_scope');
    expectExecuteContaining("DELETE FROM wallets");
    expectExecuteContaining("'wallet-cash-1', 'wallet-bank-1', 'wallet-ewallet-1', 'wallet-cc-1'");

    // Each migration is bookmarked with an INSERT
    expectMigrationMarked(1, '001_init');
    expectMigrationMarked(2, '002_indexes');
    expectMigrationMarked(3, '003_transactions_soft_delete');
    expectMigrationMarked(4, '004_transactions_receipt_path');
    expectMigrationMarked(15, '015_budget_account_type_scope');
    expectMigrationMarked(16, '016_error_logs');
    expectMigrationMarked(17, '017_budget_single_active_scope');
    expectMigrationMarked(18, '018_budget_single_active_category');
    expectMigrationMarked(19, '019_transfer_category');
    expectMigrationMarked(20, '020_category_description');
    expectMigrationMarked(21, '021_remove_unused_seed_wallets');
  });

  it('wraps each migration in a transaction (beginTransaction / commitTransaction)', async () => {
    await runMigrations();

    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(21);
    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(21);
    expect(mockDb.rollbackTransaction).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Migration runner – idempotency (already at current version)
  // -------------------------------------------------------------------------
  it('skips all migrations when DB already at latest version', async () => {
    mockDb.query.mockResolvedValueOnce({
      values: Array.from({ length: 21 }, (_value, index) => ({ version: index + 1 })),
    });

    await runMigrations();

    // The migrations tracking table create still runs (idempotent IF NOT EXISTS)
    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS migrations')
    );
    // But no migration SQL should have been executed beyond that
    expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    expect(mockDb.commitTransaction).not.toHaveBeenCalled();
  });

  it('only runs pending migrations when partially migrated', async () => {
    // Simulate DB at version 2 – migrations 3 and 4 are pending
    mockDb.query.mockResolvedValueOnce({ values: [{ version: 1 }, { version: 2 }] });

    await runMigrations();

    // Migrations 1 & 2 should NOT be re-run
    expectNoExecuteContaining('CREATE TABLE IF NOT EXISTS wallets');
    expectNoExecuteContaining('CREATE INDEX IF NOT EXISTS idx_transactions_date');

    // Migrations 3 & 4 should run
    expectExecuteContaining('ALTER TABLE transactions ADD COLUMN deleted_at');
    expectExecuteContaining('ALTER TABLE transactions ADD COLUMN receipt_path');
    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(19);
  });

  // -------------------------------------------------------------------------
  // Migration runner – failure / rollback
  // -------------------------------------------------------------------------
  it('rolls back and rethrows when a migration sql fails', async () => {
    const dbError = new Error('SQL constraint violation');
    // Let the CREATE TABLE IF NOT EXISTS migrations succeed, then fail on first migration
    mockDb.execute
      .mockResolvedValueOnce(undefined)  // migrations table create
      .mockRejectedValueOnce(dbError);   // 001_init.sql fails

    await expect(runMigrations()).rejects.toThrow('SQL constraint violation');

    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.commitTransaction).not.toHaveBeenCalled();
  });

  it('serializes concurrent native root transactions', async () => {
    let active = false;
    let running = 0;
    let maxRunning = 0;

    mockDb.isTransactionActive.mockResolvedValue({ result: false });
    mockDb.beginTransaction.mockImplementation(async () => {
      if (active) throw new Error('fail in beginTransactionAlready');
      active = true;
    });
    mockDb.commitTransaction.mockImplementation(async () => {
      active = false;
    });

    const results = await Promise.all([
      runInTransaction(async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 0));
        running -= 1;
        return 'first';
      }),
      runInTransaction(async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 0));
        running -= 1;
        return 'second';
      }),
    ]);

    expect(results).toEqual(['first', 'second']);
    expect(maxRunning).toBe(1);
    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(2);
    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(2);
    expect(mockDb.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('disables implicit db.run transactions inside a managed transaction', async () => {
    const transactionRepository = new SQLiteTransactionRepository();
    const walletRepository = new SQLiteWalletRepository();

    mockDb.query.mockResolvedValueOnce({
      values: [{
        id: 'tx-1',
        wallet_id: 'w-1',
        category_id: 'c-1',
        type: 'expense',
        amount: 100,
        note: null,
        receipt_path: null,
        to_wallet_id: null,
        transaction_date: 1000,
        created_at: 2000,
        updated_at: 2000,
        deleted_at: null,
      }],
    });

    await runInTransaction(async () => {
      await transactionRepository.create({
        id: 'tx-1',
        wallet_id: 'w-1',
        category_id: 'c-1',
        type: 'expense',
        amount: 100,
        transaction_date: 1000,
        created_at: 2000,
        updated_at: 2000,
      });
      await walletRepository.updateBalanceDelta('w-1', -100, 2000);
    });

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO transactions'),
      expect.any(Array),
      false
    );
    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [-100, 2000, 'w-1'],
      false
    );
  });

  // -------------------------------------------------------------------------
  // SQL Schema content assertions (no DB needed)
  // -------------------------------------------------------------------------
  it('001_init.sql defines all required tables', async () => {
    const initSql = await import('../core/db/migrations/001_init.sql?raw').then(m => m.default);

    const requiredTables = [
      'wallets', 'categories', 'transactions',
      'recurring_bills', 'app_settings', 'sync_changes',
    ];
    requiredTables.forEach(table => {
      expect(initSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    });
  });

  it('001_init.sql enforces CHECK constraint: amount > 0 on transactions', async () => {
    const initSql = await import('../core/db/migrations/001_init.sql?raw').then(m => m.default);
    expect(initSql).toContain('amount REAL NOT NULL CHECK (amount > 0)');
  });

  it('001_init.sql enforces type CHECK on transactions', async () => {
    const initSql = await import('../core/db/migrations/001_init.sql?raw').then(m => m.default);
    expect(initSql).toContain("CHECK (type IN ('income', 'expense', 'transfer'))");
  });

  it('003 migration adds deleted_at column', async () => {
    const sql = await import('../core/db/migrations/003_transactions_soft_delete.sql?raw').then(m => m.default);
    expect(sql).toContain('ADD COLUMN deleted_at INTEGER DEFAULT NULL');
  });

  it('004 migration adds receipt_path column', async () => {
    const sql = await import('../core/db/migrations/004_transactions_receipt_path.sql?raw').then(m => m.default);
    expect(sql).toContain('ADD COLUMN receipt_path TEXT DEFAULT NULL');
  });

  // -------------------------------------------------------------------------
  // Seed – happy path and idempotency
  // -------------------------------------------------------------------------
  it('seed inserts default categories when DB is empty', async () => {
    await seedDefaultData();

    const walletInserts = (mockDb.run as ReturnType<typeof vi.fn>).mock.calls
      .filter((args: any[]) => args[0]?.includes('INSERT INTO wallets'));
    expect(walletInserts.length).toBe(0);

    // Categories inserted – spot-check first and last
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO categories'),
      expect.arrayContaining(['cat-inc-1'])
    );
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO categories'),
      expect.arrayContaining(['cat-exp-4'])
    );
  });

  it('seed does NOT insert categories when both income and expense categories already exist', async () => {
    mockDb.query
      .mockResolvedValueOnce({ values: [{ id: 'cat-income-existing' }] })
      .mockResolvedValueOnce({ values: [{ id: 'cat-expense-existing' }] });

    await seedDefaultData();

    const categoryInserts = (mockDb.run as ReturnType<typeof vi.fn>).mock.calls
      .filter((args: any[]) => args[0]?.includes('INSERT OR IGNORE INTO categories'));

    expect(categoryInserts.length).toBe(0);
  });

  it('seed inserts income defaults when only income categories are missing', async () => {
    mockDb.query
      .mockResolvedValueOnce({ values: [] })
      .mockResolvedValueOnce({ values: [{ id: 'cat-expense-existing' }] });

    await seedDefaultData();

    const categoryInserts = (mockDb.run as ReturnType<typeof vi.fn>).mock.calls
      .filter((args: any[]) => args[0]?.includes('INSERT OR IGNORE INTO categories'));

    expect(categoryInserts.map((args: any[]) => args[1][0])).toEqual(['cat-inc-1', 'cat-inc-2']);
  });

  it('seed inserts expense defaults when only the transfer category exists', async () => {
    mockDb.query
      .mockResolvedValueOnce({ values: [{ id: 'cat-income-existing' }] })
      .mockResolvedValueOnce({ values: [] });

    await seedDefaultData();

    const insertedCategoryIds = (mockDb.run as ReturnType<typeof vi.fn>).mock.calls
      .filter((args: any[]) => args[0]?.includes('INSERT OR IGNORE INTO categories'))
      .map((args: any[]) => args[1][0]);

    expect(insertedCategoryIds).toEqual([
      'cat-exp-1',
      'cat-exp-2',
      'cat-exp-3',
      'cat-exp-4',
      'cat-transfer',
    ]);
  });

  it('category repository persists selected icon on create and update', async () => {
    const repository = new SQLiteCategoryRepository();

    await repository.create('cat-custom', {
      name: 'Custom',
      type: 'expense',
      icon: 'coffee',
      color: '#f59e0b',
      description: null,
    }, 1000);

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO categories'),
      expect.arrayContaining(['cat-custom', 'Custom', 'expense', 'coffee', '#f59e0b', null, 1000, 1000]),
    );

    await repository.update('cat-custom', {
      name: 'Custom',
      type: 'expense',
      icon: 'receipt',
      color: '#f59e0b',
      description: null,
    }, 2000);

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE categories'),
      expect.arrayContaining(['Custom', 'expense', 'receipt', '#f59e0b', null, 2000, 'cat-custom']),
    );
  });

  it('wallet repository counts references before delete and deletes by id', async () => {
    const walletRepository = new SQLiteWalletRepository();
    mockDb.query
      .mockResolvedValueOnce({ values: [{ count: 2 }] })
      .mockResolvedValueOnce({ values: [{ count: 1 }] })
      .mockResolvedValueOnce({ values: [{ count: 0 }] });

    const counts = await walletRepository.getReferenceCounts('w-1');

    expect(counts).toEqual({ transactions: 2, recurringBills: 1, budgets: 0 });
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM transactions'),
      ['w-1', 'w-1']
    );
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS count FROM recurring_bills WHERE wallet_id = ? AND is_active != -1',
      ['w-1']
    );
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS count FROM budgets WHERE wallet_id = ? AND is_active = 1',
      ['w-1']
    );

    await walletRepository.delete('w-1');

    expect(mockDb.run).toHaveBeenCalledWith(
      'DELETE FROM wallets WHERE id = ?',
      ['w-1'],
      true
    );
  });

  it('category repository clears icon by persisting null', async () => {
    const repository = new SQLiteCategoryRepository();

    await repository.update('cat-custom', {
      name: 'Custom',
      type: 'income',
      icon: null,
      color: '#10b981',
      description: null,
    }, 3000);

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE categories'),
      expect.arrayContaining(['Custom', 'income', null, '#10b981', null, 3000, 'cat-custom']),
    );
  });
});
