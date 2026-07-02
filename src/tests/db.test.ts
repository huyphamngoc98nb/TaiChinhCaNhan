import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { runMigrations, splitSqlStatements, MIGRATIONS } from '../core/db/migrations/migration-runner';
import { isManagedTransactionActive, runInTransaction } from '../core/db/sqlite/transaction';
import { seedDefaultData } from '../core/db/seed/default-categories';
import { SQLiteTransactionRepository } from '../modules/transactions/repositories/sqlite-transaction.repository';
import { SQLiteWalletRepository } from '../modules/wallets/repositories/sqlite-wallet.repository';
import { SQLiteCategoryRepository } from '../modules/categories/repositories/sqlite-category.repository';
import { WalletService } from '../modules/wallets/services/wallet.service';
import * as connection from '../core/db/sqlite/connection';
import { logger } from '@/core/telemetry/logger';

// Mock the DB connection and logger
vi.mock('../core/db/sqlite/connection', () => ({
  DB_NAME: 'test_db',
  getDbConnection: vi.fn(),
  isDatabaseReady: vi.fn(),
  initDatabaseConnection: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: vi.fn(() => 'android') },
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

  function countTransactionalMigrations(migrations = MIGRATIONS) {
    return migrations.filter(
      (migration) => !/PRAGMA\s+foreign_keys\s*=\s*OFF/i.test(migration.sql)
    ).length;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
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
  it('keeps migration versions unique, increasing, and mapped to matching files', () => {
    const versions = MIGRATIONS.map((migration) => migration.version);
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));

    for (const migration of MIGRATIONS) {
      expect(migration.name).toMatch(new RegExp(`^${String(migration.version).padStart(3, '0')}_`));
    }

    const migrationFileNames = Object.keys(import.meta.glob('../core/db/migrations/*.sql'))
      .map((filePath) => filePath.split('/').pop()?.replace(/\.sql$/, '') ?? '')
      .sort();

    expect(MIGRATIONS.map((migration) => migration.name).sort()).toEqual(migrationFileNames);
  });

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
    expectExecuteContaining('ALTER TABLE transactions ADD COLUMN to_wallet_id TEXT');
    expectNoExecuteContaining('ALTER TABLE transactions ADD COLUMN to_wallet_id TEXT REFERENCES');
    expectExecuteContaining('CREATE TABLE IF NOT EXISTS budgets');
    expectExecuteContaining('ALTER TABLE budgets ADD COLUMN account_type_scope');
    expectExecuteContaining('CREATE TABLE IF NOT EXISTS error_logs');
    expectExecuteContaining('CREATE INDEX IF NOT EXISTS idx_budgets_active_scope');
    expectNoExecuteContaining('DELETE FROM wallets');
    expectNoExecuteContaining("'wallet-cash-1', 'wallet-bank-1', 'wallet-ewallet-1', 'wallet-cc-1'");
    expectNoExecuteContaining('SELECT to_wallet_id');
    expectNoExecuteContaining('transactions.wallet_id = wallets.id');
    expectNoExecuteContaining('older.id');
    expectNoExecuteContaining('newer.id');
    expectExecuteContaining('CREATE TABLE IF NOT EXISTS credit_card_statements');
    expectExecuteContaining('ALTER TABLE wallets ADD COLUMN annual_fee');
    expectExecuteContaining('CREATE TABLE IF NOT EXISTS loans');
    expectExecuteContaining('CREATE TABLE IF NOT EXISTS loan_payments');
    expectExecuteContaining('ALTER TABLE categories ADD COLUMN slug TEXT');
    expectExecuteContaining("'cho_vay', 'Cho vay'");
    expectExecuteContaining('ALTER TABLE loans ADD COLUMN skip_transaction INTEGER NOT NULL DEFAULT 0');
    expectExecuteContaining('CREATE TABLE loans_new');
    expectExecuteContaining('CHECK (skip_transaction = 1 OR wallet_id IS NOT NULL)');
    expectExecuteContaining('ALTER TABLE loans ADD COLUMN linked_transaction_id');
    expectExecuteContaining('CREATE TABLE IF NOT EXISTS backup_files');
    expectExecuteContaining('idx_backup_files_kind_created');
    expectExecuteContaining('ALTER TABLE transactions ADD COLUMN source_type TEXT');
    expectExecuteContaining('ALTER TABLE transactions ADD COLUMN source_id TEXT');
    expectExecuteContaining('ALTER TABLE transactions ADD COLUMN source_event TEXT');
    expectExecuteContaining('CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_active_source');

    const triggerStatements = mockDb.execute.mock.calls
      .map(([sql]: [string]) => sql)
      .filter((sql: string) => sql.trimStart().startsWith('CREATE TRIGGER'));
    expect(triggerStatements.length).toBeGreaterThan(0);
    expect(triggerStatements.every((sql: string) => sql.endsWith('END;\n'))).toBe(true);

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
    expectMigrationMarked(22, '022_credit_card_statements');
    expectMigrationMarked(23, '023_loans');
    expectMigrationMarked(24, '024_loan_categories');
    expectMigrationMarked(25, '025_loan_skip_transaction');
    expectMigrationMarked(26, '026_loan_linked_transaction');
    expectMigrationMarked(27, '027_loan_date');
    expectMigrationMarked(34, '034_backup_files');
    expectMigrationMarked(35, '035_transaction_source_metadata');
  });

  it('wraps regular migrations in transactions and runs foreign-key rebuilds outside them', async () => {
    await runMigrations();

    const transactionalCount = countTransactionalMigrations();
    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(transactionalCount);
    expect(mockDb.commitTransaction).toHaveBeenCalledTimes(transactionalCount);
    expect(mockDb.rollbackTransaction).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Migration runner – idempotency (already at current version)
  // -------------------------------------------------------------------------
  it('skips all migrations when DB already at latest version', async () => {
    mockDb.query.mockResolvedValueOnce({
      values: MIGRATIONS.map((migration) => ({
        version: migration.version,
        name: migration.name,
      })),
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
    expect(mockDb.beginTransaction).toHaveBeenCalledTimes(
      countTransactionalMigrations(MIGRATIONS.filter((migration) => migration.version > 2))
    );
  });

  it('marks category description migration done when the column already exists', async () => {
    mockDb.query
      .mockResolvedValueOnce({
        values: Array.from({ length: 19 }, (_value, index) => ({ version: index + 1 })),
      })
      .mockResolvedValueOnce({ values: [{ name: 'id' }, { name: 'description' }] });

    await runMigrations();

    expect(mockDb.query).toHaveBeenCalledWith('PRAGMA table_info(categories)');
    expectNoExecuteContaining('ALTER TABLE categories ADD COLUMN description TEXT');
    expectMigrationMarked(20, '020_category_description');
    expectMigrationMarked(21, '021_remove_unused_seed_wallets');
    expectMigrationMarked(22, '022_credit_card_statements');
    expectMigrationMarked(23, '023_loans');
    expectMigrationMarked(24, '024_loan_categories');
    expectMigrationMarked(25, '025_loan_skip_transaction');
    expectMigrationMarked(26, '026_loan_linked_transaction');
    expect(logger.warn).not.toHaveBeenCalledWith(
      '020_category_description column already exists. Marking done.'
    );
    expect(logger.info).toHaveBeenCalledWith(
      '020_category_description column already exists. Marking done.',
      { context: 'Migration.020_category_description' }
    );
  });

  it('repairs legacy loan numbering when linked transaction was recorded as version 25 before skip transaction', async () => {
    const legacyRows = [
      ...Array.from({ length: 24 }, (_value, index) => ({
        version: index + 1,
        name: String(index + 1).padStart(3, '0'),
      })),
      { version: 25, name: '025_loan_linked_transaction' },
    ];
    const repairedRows = [
      ...legacyRows.slice(0, 24),
      { version: 25, name: '025_loan_skip_transaction' },
    ];
    const loanColumnsWithLinkedOnly = [
      { name: 'id' },
      { name: 'wallet_id' },
      { name: 'linked_transaction_id' },
    ];

    mockDb.query
      .mockResolvedValueOnce({ values: legacyRows })
      .mockResolvedValueOnce({ values: [{ name: 'loans' }] })
      .mockResolvedValueOnce({ values: loanColumnsWithLinkedOnly })
      .mockResolvedValueOnce({ values: loanColumnsWithLinkedOnly })
      .mockResolvedValueOnce({ values: repairedRows })
      .mockResolvedValueOnce({ values: loanColumnsWithLinkedOnly });
    mockDb.execute.mockImplementation(async (sql: string) => {
      if (sql.includes('ALTER TABLE loans ADD COLUMN linked_transaction_id')) {
        throw new Error('Execute: duplicate column name: linked_transaction_id');
      }
    });

    await runMigrations();

    expectExecuteContaining('ALTER TABLE loans ADD COLUMN skip_transaction INTEGER NOT NULL DEFAULT 0');
    expectExecuteContaining('linked_transaction_id TEXT');
    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE migrations SET name = ? WHERE version = ?',
      ['025_loan_skip_transaction', 25],
      false
    );
    expectMigrationMarked(26, '026_loan_linked_transaction');
    expectNoExecuteContaining('INSERT INTO transactions');
  });

  it('skips duplicate ADD COLUMN statements and still completes the migration', async () => {
    mockDb.query
      .mockResolvedValueOnce({ values: [{ version: 1 }, { version: 2 }] })
      .mockResolvedValueOnce({ values: [{ name: 'id' }, { name: 'deleted_at' }] });
    mockDb.execute.mockImplementation(async (sql: string) => {
      if (sql.includes('ALTER TABLE transactions ADD COLUMN deleted_at')) {
        throw new Error('Execute: duplicate column name: deleted_at');
      }
    });

    await runMigrations();

    expect(mockDb.query).toHaveBeenCalledWith('PRAGMA table_info(transactions)');
    expectMigrationMarked(3, '003_transactions_soft_delete');
    expectMigrationMarked(26, '026_loan_linked_transaction');
    expectNoExecuteContaining('INSERT INTO transactions');
  });

  it('runs foreign-key-off table rebuild migrations outside native transactions', async () => {
    mockDb.query.mockResolvedValueOnce({
      values: MIGRATIONS
        .filter((migration) => migration.version < 32 || migration.version > 32)
        .map((migration) => ({ version: migration.version, name: migration.name })),
    });

    await runMigrations();

    expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    expect(mockDb.commitTransaction).not.toHaveBeenCalled();
    expect(mockDb.rollbackTransaction).not.toHaveBeenCalled();
    expect(mockDb.execute.mock.calls[1][0]).toBe('PRAGMA foreign_keys = OFF;');
    expectExecuteContaining('DROP TABLE wallets');
    expectExecuteContaining('PRAGMA foreign_keys = ON;');
    expectMigrationMarked(32, '032_wallet_debt_or_loan_account_type');
  });

  it('ignores consecutive SQL comments that contain semicolons', () => {
    const statements = splitSqlStatements(`
      -- First comment.
      -- Comment with a semicolon; should not become SQL.
      PRAGMA foreign_keys=OFF;
      SELECT 1;
    `);

    expect(statements).toEqual([
      'PRAGMA foreign_keys=OFF;',
      'SELECT 1;',
    ]);
  });

  it('splits two complete triggers without including fragments of the next trigger', () => {
    const statements = splitSqlStatements(`
      CREATE TRIGGER IF NOT EXISTS trg_a
      AFTER INSERT ON t
      BEGIN
        UPDATE t SET x = NEW.x WHERE id = NEW.id;
      END;

      -- second trigger
      CREATE TRIGGER IF NOT EXISTS trg_b
      AFTER UPDATE OF x ON t
      BEGIN
        UPDATE t SET y = NEW.x WHERE id = NEW.id;
      END;
    `);

    expect(statements).toHaveLength(2);
    expect(statements.every((statement) => statement.startsWith('CREATE TRIGGER'))).toBe(true);
    expect(statements.every((statement) => statement.endsWith('END;'))).toBe(true);
    expect(statements[0]).not.toContain('trg_b');
  });

  it('keeps DROP statements, triggers, and following statements in order', () => {
    const statements = splitSqlStatements(`
      DROP TRIGGER IF EXISTS trg_a;
      DROP TRIGGER IF EXISTS trg_b;

      CREATE TRIGGER IF NOT EXISTS trg_a
      AFTER INSERT ON t
      BEGIN
        UPDATE t SET x = NEW.x WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_b
      AFTER UPDATE OF x ON t
      BEGIN
        UPDATE t SET y = NEW.x WHERE id = NEW.id;
      END;

      UPDATE t SET x = x WHERE x IS NULL;
    `);

    expect(statements).toHaveLength(5);
    expect(statements.map((statement) => statement.match(/^(?:CREATE\s+TRIGGER|DROP\s+TRIGGER|UPDATE)/)?.[0]))
      .toEqual(['DROP TRIGGER', 'DROP TRIGGER', 'CREATE TRIGGER', 'CREATE TRIGGER', 'UPDATE']);
    expect(statements.every((statement) => statement.endsWith(';'))).toBe(true);
    expect(statements[2]).not.toContain('trg_b');
    expect(statements[3]).not.toContain('UPDATE t SET x = x WHERE x IS NULL');
  });

  it('keeps a single-line trigger as one complete statement', () => {
    const statements = splitSqlStatements(
      'CREATE TRIGGER t AFTER INSERT ON x BEGIN UPDATE x SET a=1 WHERE id=NEW.id; END;'
    );

    expect(statements).toEqual([
      'CREATE TRIGGER t AFTER INSERT ON x BEGIN UPDATE x SET a=1 WHERE id=NEW.id; END;',
    ]);
  });

  it('finds a trigger terminator after whitespace and line comments', () => {
    const statements = splitSqlStatements(`
      CREATE TRIGGER trg_whitespace AFTER INSERT ON t
      BEGIN
        UPDATE t SET x = NEW.x;
      END

      -- terminator follows comments
      -- and multiple blank lines

      ;
      UPDATE t SET x = x;
    `);

    expect(statements).toHaveLength(2);
    expect(statements[0]).toMatch(/^CREATE TRIGGER[\s\S]*;\s*$/);
    expect(statements[0]).not.toContain('UPDATE t SET x = x;');
    expect(statements[1]).toBe('UPDATE t SET x = x;');
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

  it('serializes concurrent web root transactions without native BEGIN/COMMIT', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    let running = 0;
    let maxRunning = 0;

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
    expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    expect(mockDb.commitTransaction).not.toHaveBeenCalled();
    expect(mockDb.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('runs direct nested web transactions inline inside the outer managed scope', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    const states: boolean[] = [];

    const result = await runInTransaction(async () => {
      states.push(isManagedTransactionActive());

      const nested = await runInTransaction(async () => {
        states.push(isManagedTransactionActive());
        return 'nested';
      });

      states.push(isManagedTransactionActive());
      return `outer-${nested}`;
    });

    expect(result).toBe('outer-nested');
    expect(states).toEqual([true, true, true]);
    expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    expect(mockDb.commitTransaction).not.toHaveBeenCalled();
    expect(mockDb.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('applies wallet balance deltas with one atomic SQL update and no balance read', async () => {
    const leakedDb = {
      ...mockDb,
      run: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(connection.getDbConnection)
      .mockResolvedValueOnce(mockDb)
      .mockResolvedValue(leakedDb);

    const walletRepository = new SQLiteWalletRepository();

    await runInTransaction(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await walletRepository.updateBalanceDelta('w-1', 100, 2000);
    });

    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [100, 2000, 'w-1'],
      false
    );
    expect(mockDb.query).not.toHaveBeenCalled();
    expect(leakedDb.run).not.toHaveBeenCalled();
  });

  it('rolls back wallet balance adjustment category when adjustment transaction creation fails', async () => {
    const wallets = new Map<string, Record<string, unknown>>([[
      'w-1',
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
    ]]);
    const categories = new Map<string, Record<string, unknown>>();
    const transactions = new Map<string, Record<string, unknown>>();
    let snapshot: {
      wallets: Map<string, Record<string, unknown>>;
      categories: Map<string, Record<string, unknown>>;
      transactions: Map<string, Record<string, unknown>>;
    } | null = null;
    const cloneMap = (source: Map<string, Record<string, unknown>>) =>
      new Map(Array.from(source, ([key, value]) => [key, { ...value }]));

    mockDb.beginTransaction.mockImplementation(async () => {
      snapshot = {
        wallets: cloneMap(wallets),
        categories: cloneMap(categories),
        transactions: cloneMap(transactions),
      };
    });
    mockDb.rollbackTransaction.mockImplementation(async () => {
      if (!snapshot) return;
      wallets.clear();
      categories.clear();
      transactions.clear();
      snapshot.wallets.forEach((value, key) => wallets.set(key, { ...value }));
      snapshot.categories.forEach((value, key) => categories.set(key, { ...value }));
      snapshot.transactions.forEach((value, key) => transactions.set(key, { ...value }));
      snapshot = null;
    });
    mockDb.commitTransaction.mockImplementation(async () => {
      snapshot = null;
    });
    mockDb.query.mockImplementation(async (sql: string, values: unknown[] = []) => {
      if (sql.includes('FROM wallets') && sql.includes('WHERE id = ?')) {
        const wallet = wallets.get(values[0] as string);
        return { values: wallet ? [{ ...wallet }] : [] };
      }

      if (sql.includes('FROM categories')) {
        const [categoryId, categoryName, categoryType] = values;
        const category = categories.get(categoryId as string)
          ?? Array.from(categories.values()).find((item) =>
            item.name === categoryName && item.type === categoryType
          );
        return { values: category ? [{ ...category }] : [] };
      }

      if (sql.includes('FROM transactions') && sql.includes('WHERE id = ?')) {
        const transaction = transactions.get(values[0] as string);
        return { values: transaction ? [{ ...transaction }] : [] };
      }

      return { values: [] };
    });
    mockDb.run.mockImplementation(async (sql: string, values: unknown[] = []) => {
      if (sql.includes('INSERT OR IGNORE INTO categories')) {
        const [id, name, type, icon, color, description, createdAt, updatedAt] = values;
        if (!categories.has(id as string)) {
          categories.set(id as string, {
            id,
            name,
            type,
            icon,
            color,
            description,
            is_system: 0,
            created_at: createdAt,
            updated_at: updatedAt,
          });
        }
        return { changes: { changes: 1 } };
      }

      if (sql.includes('INSERT INTO transactions')) {
        throw new Error('transaction insert failed');
      }

      if (sql.includes('UPDATE wallets SET balance = balance +')) {
        const [delta, updatedAt, id] = values;
        const wallet = wallets.get(id as string);
        if (wallet) {
          wallets.set(id as string, {
            ...wallet,
            balance: Number(wallet.balance) + Number(delta),
            updated_at: updatedAt,
          });
        }
        return { changes: { changes: wallet ? 1 : 0 } };
      }

      if (sql.includes('UPDATE wallets SET')) {
        const id = values[values.length - 1] as string;
        const wallet = wallets.get(id);
        if (wallet) {
          wallets.set(id, { ...wallet, name: values[0], updated_at: values[values.length - 2] });
        }
        return { changes: { changes: wallet ? 1 : 0 } };
      }

      return { changes: { changes: 0 } };
    });

    const walletService = new WalletService(
      new SQLiteWalletRepository(),
      new SQLiteTransactionRepository()
    );

    await expect(walletService.updateWallet('w-1', {
      name: 'Cash Updated',
      balance: 12_500,
    })).rejects.toThrow('transaction insert failed');

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO categories'),
      expect.any(Array),
      false
    );
    expect(mockDb.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(mockDb.commitTransaction).not.toHaveBeenCalled();
    expect(wallets.get('w-1')).toMatchObject({ name: 'Cash', balance: 10_000 });
    expect(categories.size).toBe(0);
    expect(transactions.size).toBe(0);
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

  it('034 migration creates backup file metadata table and indexes', async () => {
    const sql = await import('../core/db/migrations/034_backup_files.sql?raw').then(m => m.default);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS backup_files');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_backup_files_kind_created');
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
      true,
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
      true,
    );
  });

  it('wallet repository counts references before delete and deletes by id', async () => {
    const walletRepository = new SQLiteWalletRepository();
    mockDb.query
      .mockResolvedValueOnce({ values: [{ count: 2 }] })
      .mockResolvedValueOnce({ values: [{ count: 1 }] })
      .mockResolvedValueOnce({ values: [{ count: 0 }] })
      .mockResolvedValueOnce({ values: [{ count: 3 }] })
      .mockResolvedValueOnce({ values: [{ count: 4 }] });

    const counts = await walletRepository.getReferenceCounts('w-1');

    expect(counts).toEqual({
      transactions: 2,
      recurringBills: 1,
      budgets: 0,
      loans: 3,
      loanPayments: 4,
    });
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
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS count FROM loans WHERE wallet_id = ? AND deleted_at IS NULL',
      ['w-1']
    );
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS count FROM loan_payments WHERE wallet_id = ?',
      ['w-1']
    );

    await walletRepository.delete('w-1');

    expect(mockDb.run).toHaveBeenCalledWith(
      'DELETE FROM wallets WHERE id = ?',
      ['w-1'],
      true
    );
  });

  it('upserts credit card statements without opening an implicit transaction', async () => {
    const walletRepository = new SQLiteWalletRepository();

    await walletRepository.upsertCreditCardStatement({
      wallet_id: 'cc-1',
      period_start: 1,
      period_end: 2,
      closing_at: 2,
      due_at: 3,
      statement_balance: 1000,
      paid_amount: 250,
      remaining_amount: 750,
      status: 'partial',
      now: 4,
    });

    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO credit_card_statements'),
      expect.arrayContaining(['cc-1', 1, 2, 3, 1000, 250, 750, 'partial', 4]),
      false
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
      true,
    );
  });
});
