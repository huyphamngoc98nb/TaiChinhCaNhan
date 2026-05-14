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
      metadata: { version: '1.0', exported_at: Date.now(), app_version: '1.0.0' },
      wallets: [],
      categories: [],
      transactions: [],
      recurring_bills: [],
      app_settings: []
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
      const invalid = { ...validPayload, metadata: { ...validPayload.metadata, version: '2.0' } };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported backup version');
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
        metadata: { version: '1.0', exported_at: 0, app_version: '' },
        wallets: [], categories: [], transactions: [], recurring_bills: [], app_settings: []
      };
      await restoreDatabase(payload);
      
      expect(mockDb.run).toHaveBeenCalledWith('PRAGMA foreign_keys = OFF');
      expect(mockDb.executeSet).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    });

    it('re-enables foreign keys even if restore fails', async () => {
      const payload = {
        metadata: { version: '1.0', exported_at: 0, app_version: '' },
        wallets: [], categories: [], transactions: [], recurring_bills: [], app_settings: []
      };
      mockDb.executeSet.mockRejectedValue(new Error('Batch Error'));

      await expect(restoreDatabase(payload)).rejects.toThrow('Batch Error');
      expect(mockDb.run).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    });
  });
});
