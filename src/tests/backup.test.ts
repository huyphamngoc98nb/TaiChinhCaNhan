import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateBackupPayload } from '@/modules/backup/services/validate-backup-payload';
import { restoreDatabase } from '@/modules/backup/services/restore-database';
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
      error_logs: []
    };

    it('validates a correct payload', () => {
      const result = validateBackupPayload(validPayload);
      expect(result.isValid).toBe(true);
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
      };

      await restoreDatabase(payload);

      const statements = mockDb.executeSet.mock.calls[0][0];
      expect(statements).toEqual(
        expect.arrayContaining([
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
        ])
      );
    });
  });
});
