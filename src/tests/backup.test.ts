import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateBackupPayload } from '@/modules/backup/services/validate-backup-payload';
import { importBackupJson } from '@/modules/backup/services/import-backup-json';
import { restoreDatabase } from '@/modules/backup/services/restore-database';
import { exportBackupJson } from '@/modules/backup/services/export-backup-json';
import * as connection from '@/core/db/sqlite/connection';

vi.mock('@/core/db/sqlite/connection', () => ({
  DB_NAME: 'test_db',
  getDbConnection: vi.fn(),
}));

vi.mock('@/core/db/sqlite/pragmas', () => ({
  sqlite: { saveToStore: vi.fn() },
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Backup Module Tests', () => {
  describe('validateBackupPayload', () => {
    const validPayload = {
      metadata: { version: '2.0', schema_version: 16, exported_at: Date.now(), app_version: '0.1.0' },
      wallets: [],
      categories: [],
      transactions: [],
      recurring_bills: [],
      app_settings: [],
      budgets: [],
      error_logs: [],
      loans: [],
      loan_payments: [],
    };

    it('validates a correct payload', () => {
      const result = validateBackupPayload(validPayload);
      expect(result.isValid).toBe(true);
    });

    it('validates loan rows for lend and borrow backups', () => {
      const result = validateBackupPayload({
        ...validPayload,
        loans: [
          {
            id: 'loan-lend',
            wallet_id: 'wallet-1',
            type: 'lend',
            contact_name: 'Alice',
            contact_info: null,
            principal: 1000,
            due_date: '2026-06-30',
            note: null,
            status: 'active',
            created_at: 1,
            updated_at: 1,
            deleted_at: null,
            skip_transaction: 0,
          },
          {
            id: 'loan-borrow',
            wallet_id: null,
            type: 'borrow',
            contact_name: 'Bob',
            contact_info: null,
            principal: 2000,
            due_date: null,
            note: 'Personal debt',
            status: 'settled',
            created_at: 2,
            updated_at: 3,
            deleted_at: null,
            skip_transaction: 1,
          },
        ],
        loan_payments: [
          {
            id: 'loan-payment-1',
            loan_id: 'loan-lend',
            wallet_id: 'wallet-1',
            amount: 500,
            payment_date: 4,
            note: null,
            created_at: 4,
          },
        ],
      });

      expect(result.isValid).toBe(true);
    });

    it('exports loans and loan payments in the backup payload', async () => {
      const rowsByTable: Record<string, unknown[]> = {
        wallets: [],
        categories: [],
        transactions: [],
        recurring_bills: [],
        app_settings: [],
        budgets: [],
        error_logs: [],
        loans: [{ id: 'loan-1', type: 'lend' }],
        loan_payments: [{ id: 'loan-payment-1', loan_id: 'loan-1' }],
      };
      const mockDb = {
        query: vi.fn(async (sql: string) => {
          const table = sql.replace('SELECT * FROM ', '');
          return { values: rowsByTable[table] ?? [] };
        }),
      };
      vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb as any);

      const payload = await exportBackupJson();

      expect(payload.loans).toEqual(rowsByTable.loans);
      expect(payload.loan_payments).toEqual(rowsByTable.loan_payments);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM loans');
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM loan_payments');
    });

    it('imports a JSON file object through the browser file API', async () => {
      const file = new File([JSON.stringify(validPayload)], 'expense_tracker_backup.json', {
        type: 'application/json',
      });
      const mockDb = {
        run: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
        executeSet: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
      };
      vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb as any);

      await importBackupJson(file);

      expect(mockDb.executeSet).toHaveBeenCalled();
    });

    it('rejects payload with missing sections', () => {
      const invalid = { ...validPayload };
      delete (invalid as any).transactions;
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required section: transactions');
    });

    it('rejects unsupported versions', () => {
      const invalid = { ...validPayload, metadata: { ...validPayload.metadata, version: '3.0' } };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported backup version');
    });

    it('rejects unsupported schema versions for current backup format', () => {
      const invalid = { ...validPayload, metadata: { ...validPayload.metadata, schema_version: 17 } };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported schema version');
    });

    it('rejects rows that do not match the section schema', () => {
      const invalid = {
        ...validPayload,
        wallets: [{ id: 'wallet-1', name: 'Cash', currency: 'VND', balance: '1000' }],
      };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('wallets[0].balance must be a number');
    });

    it('rejects non-array sections', () => {
      const invalid = { ...validPayload, wallets: {} };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Section wallets must be an array');
    });
  });

  describe('restoreDatabase Rollback & Safety', () => {
    let mockDb: any;

    beforeEach(() => {
      vi.clearAllMocks();
      mockDb = {
        run: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
        executeSet: vi.fn().mockResolvedValue({ changes: { changes: 10 } }),
      };
      vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb);
    });

    it('disables foreign keys before executeSet and re-enables them after', async () => {
      const payload = {
        metadata: { version: '2.0', schema_version: 16, exported_at: 0, app_version: '' },
        wallets: [], categories: [], transactions: [], recurring_bills: [], app_settings: []
      };
      await restoreDatabase(payload);
      
      expect(mockDb.run).toHaveBeenCalledWith('PRAGMA foreign_keys = OFF');
      expect(mockDb.executeSet).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    });

    it('re-enables foreign keys even if restore fails', async () => {
      const payload = {
        metadata: { version: '2.0', schema_version: 16, exported_at: 0, app_version: '' },
        wallets: [], categories: [], transactions: [], recurring_bills: [], app_settings: []
      };
      mockDb.executeSet.mockRejectedValue(new Error('Batch Error'));

      await expect(restoreDatabase(payload)).rejects.toThrow('Batch Error');
      expect(mockDb.run).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    });

    it('restores current wallet and budget schema columns', async () => {
      const payload = {
        metadata: { version: '2.0', schema_version: 16, exported_at: 0, app_version: '' },
        wallets: [{
          id: 'wallet-1',
          name: 'Cash',
          currency: 'VND',
          balance: 1000,
          account_type: 'cash',
          icon: null,
          color: null,
          sort_order: 0,
          is_active: 1,
          exclude_from_total: 0,
          credit_limit: null,
          statement_day: null,
          due_day: null,
          created_at: 1,
          updated_at: 1,
        }],
        categories: [{
          id: 'category-1',
          name: 'Food',
          type: 'expense',
          icon: null,
          color: null,
          created_at: 1,
          updated_at: 1,
        }],
        budgets: [{
          id: 'budget-1',
          category_id: 'category-1',
          wallet_id: null,
          account_type_scope: null,
          amount: 500,
          period: 'monthly',
          start_date: 1,
          end_date: null,
          is_active: 1,
          created_at: 1,
          updated_at: 1,
        }],
        transactions: [],
        recurring_bills: [],
        app_settings: [],
        error_logs: [{
          id: 'err-1',
          level: 'error',
          message: 'Boom',
          context: 'test',
          stack: null,
          metadata_json: null,
          created_at: 1,
        }],
        loans: [{
          id: 'loan-1',
          wallet_id: 'wallet-1',
          type: 'lend',
          contact_name: 'Alice',
          contact_info: null,
          principal: 1000,
          due_date: '2026-06-30',
          note: null,
          status: 'active',
          created_at: 1,
          updated_at: 2,
          deleted_at: null,
          skip_transaction: 0,
        }],
        loan_payments: [{
          id: 'loan-payment-1',
          loan_id: 'loan-1',
          wallet_id: 'wallet-1',
          amount: 250,
          payment_date: 3,
          note: null,
          created_at: 3,
        }],
      };

      await restoreDatabase(payload);

      const statements = mockDb.executeSet.mock.calls[0][0];
      expect(statements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ statement: 'DELETE FROM loan_payments' }),
          expect.objectContaining({ statement: 'DELETE FROM loans' }),
          expect.objectContaining({ statement: 'DELETE FROM budgets' }),
          expect.objectContaining({
            statement: expect.stringContaining('INSERT INTO wallets'),
            values: expect.arrayContaining(['wallet-1', 'cash']),
          }),
          expect.objectContaining({
            statement: expect.stringContaining('INSERT INTO budgets'),
            values: expect.arrayContaining(['budget-1', 'category-1', 500, 'monthly']),
          }),
          expect.objectContaining({
            statement: expect.stringContaining('INSERT INTO error_logs'),
            values: expect.arrayContaining(['err-1', 'error', 'Boom']),
          }),
          expect.objectContaining({
            statement: expect.stringContaining('INSERT INTO loans'),
            values: expect.arrayContaining(['loan-1', 'wallet-1', 'lend', 'Alice']),
          }),
          expect.objectContaining({
            statement: expect.stringContaining('INSERT INTO loan_payments'),
            values: expect.arrayContaining(['loan-payment-1', 'loan-1', 'wallet-1', 250]),
          }),
        ])
      );
    });
  });
});
