import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Filesystem } from '@capacitor/filesystem';
import { OrphanReceiptCleanupService } from '@/core/files/receipt-cleanup';
import { ReceiptStorageService } from '@/core/files/receipt-storage';
import { getDbConnectionForTransaction } from '@/core/db/sqlite/transaction';
import { logger } from '@/core/telemetry/logger';

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: {
    mkdir: vi.fn(),
    readdir: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

vi.mock('@/core/db/sqlite/transaction', () => ({
  getDbConnectionForTransaction: vi.fn(),
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('OrphanReceiptCleanupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Filesystem.mkdir).mockResolvedValue();
    vi.mocked(Filesystem.readdir).mockResolvedValue({
      files: [
        { name: 'valid.jpg', type: 'file', size: 1, mtime: 0, uri: '' },
        { name: 'orphan.jpg', type: 'file', size: 1, mtime: 0, uri: '' },
      ],
    });
    vi.mocked(Filesystem.deleteFile).mockResolvedValue();
  });

  it('deletes orphan receipts while keeping files referenced by active transactions', async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce({ values: [{ id: 'tx-1' }] })
        .mockResolvedValueOnce({ values: [] }),
    };
    vi.mocked(getDbConnectionForTransaction).mockResolvedValue(db);

    await expect(new OrphanReceiptCleanupService().run()).resolves.toEqual({
      deleted: 1,
      errors: 0,
    });

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE receipt_path = ? AND deleted_at IS NULL'),
      ['receipts/valid.jpg']
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE receipt_path = ? AND deleted_at IS NULL'),
      ['receipts/orphan.jpg']
    );
    expect(Filesystem.deleteFile).toHaveBeenCalledOnce();
    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path: 'receipts/orphan.jpg',
      directory: 'DATA',
    });
    expect(logger.info).toHaveBeenCalledWith('Deleted orphan receipt: receipts/orphan.jpg');
  });

  it('counts per-file errors and continues the sweep', async () => {
    const deleteSpy = vi.spyOn(ReceiptStorageService, 'deleteReceipt');
    const db = {
      query: vi.fn()
        .mockRejectedValueOnce(new Error('query failed'))
        .mockResolvedValueOnce({ values: [] }),
    };
    vi.mocked(getDbConnectionForTransaction).mockResolvedValue(db);

    await expect(new OrphanReceiptCleanupService().run()).resolves.toEqual({
      deleted: 1,
      errors: 1,
    });

    expect(deleteSpy).toHaveBeenCalledWith('receipts/orphan.jpg');
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to clean up receipt at receipts/valid.jpg',
      expect.any(Error)
    );
  });
});
