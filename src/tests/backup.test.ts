import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeBackupPayload, validateBackupPayload } from '@/modules/backup/services/validate-backup-payload';
import { importBackupJson, prepareBackupImport } from '@/modules/backup/services/import-backup-json';
import { restoreDatabase } from '@/modules/backup/services/restore-database';
import { exportBackupJson } from '@/modules/backup/services/export-backup-json';
import {
  decryptBackupEnvelope,
  encryptBackupPayload,
  isEncryptedBackupEnvelope,
} from '@/modules/backup/services/encrypted-backup';
import { BackupPayload } from '@/modules/backup/domain/backup.model';
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
          annual_fee: null,
          created_at: 1,
          updated_at: 1,
        }],
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
            linked_transaction_id: null,
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
            linked_transaction_id: null,
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
          const table = sql.match(/FROM\s+(\w+)/)?.[1] ?? '';
          return { values: rowsByTable[table] ?? [] };
        }),
      };
      vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb as any);

      const payload = await exportBackupJson();

      expect(payload.loans).toEqual(rowsByTable.loans);
      expect(payload.loan_payments).toEqual(rowsByTable.loan_payments);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM loans');
      expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM loan_payments');
      const transactionQuery = mockDb.query.mock.calls
        .map(([sql]) => sql as string)
        .find((sql) => sql.includes('FROM transactions'));
      expect(transactionQuery).not.toContain('receipt_path');
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

    it('prepares a valid import preview without restoring immediately', async () => {
      const file = new File([JSON.stringify(validPayload)], 'expense_tracker_backup.json', {
        type: 'application/json',
      });
      vi.mocked(connection.getDbConnection).mockClear();

      const prepared = await prepareBackupImport(file);

      expect(prepared.preview.counts).toMatchObject({
        wallets: 0,
        transactions: 0,
        categories: 0,
        budgets: 0,
        loans: 0,
      });
      expect(prepared.preview.metadata.version).toBe('2.0');
      expect(connection.getDbConnection).not.toHaveBeenCalled();
    });

    it('rejects empty backup files with a clear error', async () => {
      const file = new File(['   '], 'empty.json', { type: 'application/json' });

      await expect(prepareBackupImport(file)).rejects.toThrow('File backup rỗng.');
    });

    it('rejects files that are not JSON backup files with a clear error', async () => {
      const file = new File(['not json'], 'not-json.json', { type: 'application/json' });

      await expect(prepareBackupImport(file)).rejects.toThrow('File không đúng định dạng backup.');
    });

    it('encrypts and decrypts a backup payload without exposing sensitive plaintext', async () => {
      const sensitivePayload = {
        ...validPayload,
        wallets: [{ name: 'Private Wallet Name' }],
        transactions: [{ note: 'Sensitive transaction note' }],
      } as BackupPayload;

      const envelope = await encryptBackupPayload(sensitivePayload, 'strong-password');
      const serialized = JSON.stringify(envelope);

      expect(isEncryptedBackupEnvelope(envelope)).toBe(true);
      expect(serialized).not.toContain('Private Wallet Name');
      expect(serialized).not.toContain('Sensitive transaction note');
      await expect(decryptBackupEnvelope(envelope, 'strong-password')).resolves.toEqual(sensitivePayload);
    });

    it('fails to decrypt an encrypted backup with the wrong password', async () => {
      const envelope = await encryptBackupPayload(validPayload, 'correct-password');

      await expect(decryptBackupEnvelope(envelope, 'wrong-password')).rejects.toThrow(
        'Unable to decrypt backup'
      );
    });

    it('fails to decrypt a modified encrypted backup', async () => {
      const envelope = await encryptBackupPayload(validPayload, 'correct-password');
      const modifiedEnvelope = {
        ...envelope,
        ciphertext: `${envelope.ciphertext[0] === 'A' ? 'B' : 'A'}${envelope.ciphertext.slice(1)}`,
      };

      await expect(decryptBackupEnvelope(modifiedEnvelope, 'correct-password')).rejects.toThrow(
        'Unable to decrypt backup'
      );
    });

    it('imports an encrypted backup with the correct password', async () => {
      const envelope = await encryptBackupPayload(validPayload, 'correct-password');
      const file = new File([JSON.stringify(envelope)], 'encrypted_backup.json', {
        type: 'application/json',
      });
      const mockDb = {
        run: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
        executeSet: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
      };
      vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb as any);

      await importBackupJson(file, 'correct-password');

      expect(mockDb.executeSet).toHaveBeenCalled();
    });

    it('previews an encrypted auto backup envelope with the correct password', async () => {
      const envelope = await encryptBackupPayload(validPayload, 'correct-password');
      const file = new File(
        [JSON.stringify(envelope)],
        'expense_tracker_auto_backup_2026-06-26_08-30.json',
        { type: 'application/json' }
      );

      const prepared = await prepareBackupImport(file, 'correct-password');

      expect(prepared.preview.encrypted).toBe(true);
      expect(prepared.preview.counts.wallets).toBe(validPayload.wallets.length);
      expect(prepared.payload).toMatchObject(validPayload);
      expect(prepared.payload.metadata.app_name).toBe('TaiXiuCaNhan');
    });

    it('does not restore an encrypted backup when the password is wrong', async () => {
      const envelope = await encryptBackupPayload(validPayload, 'correct-password');
      const file = new File([JSON.stringify(envelope)], 'encrypted_backup.json', {
        type: 'application/json',
      });
      vi.mocked(connection.getDbConnection).mockClear();

      await expect(importBackupJson(file, 'wrong-password')).rejects.toThrow(
        'Unable to decrypt backup'
      );

      expect(connection.getDbConnection).not.toHaveBeenCalled();
    });

    it('imports a legacy v1 JSON file after normalizing it to the current restore shape', async () => {
      const legacyPayload = {
        metadata: { version: '1.0', schema_version: 1, exported_at: 1, app_version: '0.0.1' },
        wallets: [{ id: 'wallet-1', name: 'Cash', balance: 1000, created_at: 1, updated_at: 1 }],
        categories: [{ id: 'category-1', name: 'Food', type: 'expense', created_at: 1, updated_at: 1 }],
        transactions: [{
          id: 'tx-1',
          wallet_id: 'wallet-1',
          category_id: 'category-1',
          type: 'expense',
          amount: 100,
          transaction_date: 1,
          created_at: 1,
          updated_at: 1,
        }],
        recurring_bills: [{
          id: 'bill-1',
          wallet_id: 'wallet-1',
          category_id: 'category-1',
          name: 'Rent',
          amount: 500,
          frequency: 'monthly',
          next_due_date: 2,
          created_at: 1,
          updated_at: 1,
        }],
        app_settings: [{ key: 'currency', value: 'VND', updated_at: 1 }],
      };
      const file = new File([JSON.stringify(legacyPayload)], 'legacy_backup.json', {
        type: 'application/json',
      });
      const mockDb = {
        run: vi.fn().mockResolvedValue({ changes: { changes: 0 } }),
        executeSet: vi.fn().mockResolvedValue({ changes: { changes: 1 } }),
      };
      vi.mocked(connection.getDbConnection).mockResolvedValue(mockDb as any);

      await importBackupJson(file);

      const statements = mockDb.executeSet.mock.calls[0][0];
      expect(statements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            statement: expect.stringContaining('INSERT INTO wallets'),
            values: expect.arrayContaining(['wallet-1', 'Cash', 'VND', 1000, 'cash']),
          }),
          expect.objectContaining({
            statement: expect.stringContaining('INSERT INTO transactions'),
            values: expect.arrayContaining(['tx-1', 'wallet-1', 'category-1', 'expense', 100, null, null]),
          }),
        ])
      );
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
      expect(result.error).toContain('Supported versions');
    });

    it('rejects unsupported schema versions for current backup format', () => {
      const invalid = { ...validPayload, metadata: { ...validPayload.metadata, schema_version: 15 } };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported schema version');
      expect(result.error).toContain('Only schema 16 is supported');
    });

    it('rejects current backups missing schema_version', () => {
      const invalid = {
        ...validPayload,
        metadata: {
          version: '2.0',
          exported_at: validPayload.metadata.exported_at,
          app_version: validPayload.metadata.app_version,
        },
      };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('metadata.schema_version is required');
    });

    it('rejects current backups that omit current nullable fields', () => {
      const invalid = {
        ...validPayload,
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
      };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('wallets[0].annual_fee is required');
    });

    it('accepts and normalizes legacy v1 backups with missing current fields', () => {
      const legacyPayload = {
        metadata: { version: '1.0', exported_at: 1, app_version: '0.0.1' },
        wallets: [{ id: 'wallet-1', name: 'Cash', balance: 1000, created_at: 1, updated_at: 1 }],
        categories: [{ id: 'category-1', name: 'Food', type: 'expense', created_at: 1, updated_at: 1 }],
        transactions: [{
          id: 'tx-1',
          wallet_id: 'wallet-1',
          category_id: 'category-1',
          type: 'expense',
          amount: 100,
          transaction_date: 1,
          created_at: 1,
          updated_at: 1,
        }],
        recurring_bills: [{
          id: 'bill-1',
          wallet_id: 'wallet-1',
          category_id: 'category-1',
          name: 'Rent',
          amount: 500,
          frequency: 'monthly',
          next_due_date: 2,
          created_at: 1,
          updated_at: 1,
        }],
        app_settings: [{ key: 'currency', value: 'VND', updated_at: 1 }],
      };

      expect(validateBackupPayload(legacyPayload).isValid).toBe(true);
      const normalized = normalizeBackupPayload(legacyPayload);

      expect(normalized.metadata).toMatchObject({ version: '2.0', schema_version: 16 });
      expect(normalized.wallets[0]).toMatchObject({
        currency: 'VND',
        account_type: 'cash',
        annual_fee: null,
      });
      expect(normalized.transactions[0]).toMatchObject({
        note: null,
        deleted_at: null,
      });
      expect(normalized.transactions[0]).not.toHaveProperty('receipt_path');
      expect(normalized.budgets).toEqual([]);
      expect(normalized.loans).toEqual([]);
    });

    it('rejects legacy v1 backups with unsupported schema_version', () => {
      const invalid = {
        metadata: { version: '1.0', schema_version: 2, exported_at: 1, app_version: '0.0.1' },
        wallets: [],
        categories: [],
        transactions: [],
        recurring_bills: [],
        app_settings: [],
      };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported legacy schema version');
    });

    it('rejects rows that do not match the section schema', () => {
      const invalid = {
        ...validPayload,
        wallets: [{
          id: 'wallet-1',
          name: 'Cash',
          currency: 'VND',
          balance: '1000',
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
          created_at: 1,
          updated_at: 1,
        }],
      };
      const result = validateBackupPayload(invalid);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('wallets[0].balance must be a number');
    });

    it('accepts current backups and ignores a legacy receipt field', () => {
      const payload = {
        ...validPayload,
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
          annual_fee: null,
          created_at: 1,
          updated_at: 1,
        }],
        categories: [{
          id: 'category-1',
          name: 'Food',
          type: 'expense',
          icon: null,
          color: null,
          description: '',
          created_at: 1,
          updated_at: 1,
        }],
        transactions: [{
          id: 'transaction-1',
          wallet_id: 'wallet-1',
          category_id: 'category-1',
          type: 'expense',
          amount: 100,
          note: '',
          receipt_path: 'receipts/legacy.jpg',
          transaction_date: 1,
          to_wallet_id: null,
          created_at: 1,
          updated_at: 1,
          deleted_at: null,
        }],
      };

      const result = validateBackupPayload(payload);

      expect(result.isValid).toBe(true);
      expect(normalizeBackupPayload(payload).transactions[0]).not.toHaveProperty('receipt_path');
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
      
      expect(mockDb.run).toHaveBeenCalledWith('PRAGMA foreign_keys = OFF', [], false);
      expect(mockDb.executeSet).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalledWith('PRAGMA foreign_keys = ON', [], false);
    });

    it('re-enables foreign keys even if restore fails', async () => {
      const payload = {
        metadata: { version: '2.0', schema_version: 16, exported_at: 0, app_version: '' },
        wallets: [], categories: [], transactions: [], recurring_bills: [], app_settings: []
      };
      mockDb.executeSet.mockRejectedValue(new Error('Batch Error'));

      await expect(restoreDatabase(payload)).rejects.toThrow('Batch Error');
      expect(mockDb.run).toHaveBeenCalledWith('PRAGMA foreign_keys = ON', [], false);
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
          linked_transaction_id: null,
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

    it('restores transactions before linked loans', async () => {
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
          annual_fee: null,
          created_at: 1,
          updated_at: 1,
        }],
        categories: [{
          id: 'category-1',
          name: 'Loan',
          type: 'expense',
          icon: null,
          color: null,
          description: null,
          created_at: 1,
          updated_at: 1,
        }],
        transactions: [{
          id: 'transaction-1',
          wallet_id: 'wallet-1',
          category_id: 'category-1',
          type: 'expense',
          amount: 500,
          note: null,
          receipt_path: 'receipts/legacy.jpg',
          transaction_date: 2,
          to_wallet_id: null,
          created_at: 2,
          updated_at: 2,
          deleted_at: null,
        }],
        recurring_bills: [],
        app_settings: [],
        budgets: [],
        error_logs: [],
        loans: [{
          id: 'loan-1',
          wallet_id: 'wallet-1',
          type: 'lend',
          contact_name: 'Alice',
          contact_info: null,
          principal: 500,
          due_date: null,
          note: null,
          status: 'active',
          created_at: 3,
          updated_at: 3,
          deleted_at: null,
          skip_transaction: 0,
          linked_transaction_id: 'transaction-1',
        }],
        loan_payments: [],
      };

      await restoreDatabase(payload);

      const statements = mockDb.executeSet.mock.calls[0][0];
      const transactionIndex = statements.findIndex((item: { statement: string }) =>
        item.statement.includes('INSERT INTO transactions')
      );
      const loanIndex = statements.findIndex((item: { statement: string }) =>
        item.statement.includes('INSERT INTO loans')
      );

      expect(transactionIndex).toBeGreaterThan(-1);
      expect(loanIndex).toBeGreaterThan(-1);
      expect(transactionIndex).toBeLessThan(loanIndex);
      expect(statements[transactionIndex].statement).not.toContain('receipt_path');
      expect(statements[transactionIndex].values).not.toContain('receipts/legacy.jpg');
    });
  });
});
