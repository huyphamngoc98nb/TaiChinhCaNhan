import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runMigrations } from '../core/db/migrations/migration-runner';
import { seedDefaultData } from '../core/db/seed/default-categories';
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

    // Each migration is bookmarked with an INSERT
    expectMigrationMarked(1, '001_init');
    expectMigrationMarked(2, '002_indexes');
    expectMigrationMarked(3, '003_transactions_soft_delete');
    expectMigrationMarked(4, '004_transactions_receipt_path');
    expectMigrationMarked(15, '015_budget_account_type_scope');
    expectMigrationMarked(16, '016_error_logs');
  });

  it('wraps each migration in a transaction (beginTransaction / commitTransaction)', async () => {
    await runMigrations();

    // 4 migrations → 4 begin + 4 commit calls
    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(16);
    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(16);
    expect(mockDb.rollbackTransaction).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Migration runner – idempotency (already at current version)
  // -------------------------------------------------------------------------
  it('skips all migrations when DB already at latest version', async () => {
    mockDb.query.mockResolvedValueOnce({
      values: Array.from({ length: 16 }, (_value, index) => ({ version: index + 1 })),
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
    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(14);
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
  it('seed inserts default wallet and all 6 categories when DB is empty', async () => {
    await seedDefaultData();

    // Wallet inserted
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO wallets'),
      expect.arrayContaining(['wallet-cash-1'])
    );

    // Categories inserted – spot-check first and last
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO categories'),
      expect.arrayContaining(['cat-inc-1'])
    );
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO categories'),
      expect.arrayContaining(['cat-exp-4'])
    );
  });

  it('seed does NOT insert wallet if one already exists', async () => {
    // First query (wallets) returns a result; second (categories) returns empty
    mockDb.query
      .mockResolvedValueOnce({ values: [{ id: 'wallet-existing' }] })
      .mockResolvedValueOnce({ values: [] });

    await seedDefaultData();

    const walletInserts = (mockDb.run as ReturnType<typeof vi.fn>).mock.calls
      .filter((args: any[]) => args[0]?.includes('INSERT INTO wallets'));

    expect(walletInserts.length).toBe(0);
  });

  it('seed does NOT insert categories if any already exist', async () => {
    // First query (wallets) empty; second (categories) returns a result
    mockDb.query
      .mockResolvedValueOnce({ values: [] })
      .mockResolvedValueOnce({ values: [{ id: 'cat-existing' }] });

    await seedDefaultData();

    const categoryInserts = (mockDb.run as ReturnType<typeof vi.fn>).mock.calls
      .filter((args: any[]) => args[0]?.includes('INSERT INTO categories'));

    expect(categoryInserts.length).toBe(0);
  });
});
