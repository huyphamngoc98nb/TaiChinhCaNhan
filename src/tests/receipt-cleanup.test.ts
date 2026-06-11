import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Filesystem } from '@capacitor/filesystem';
import { ReceiptStorageService } from '@/core/files/receipt-storage';
import { runReceiptOrphanCleanup } from '@/core/files/receipt-cleanup';
import { logger } from '@/core/telemetry/logger';
import { InMemoryTransactionRepository } from './fakes/in-memory-transaction.repository';

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: {
    mkdir: vi.fn(),
    readdir: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('receipt orphan cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists and deletes only receipt files not referenced by active transactions', async () => {
    vi.mocked(Filesystem.readdir).mockResolvedValue({
      files: [
        { name: 'known.jpg', type: 'file', size: 1, mtime: 0, uri: '' },
        { name: 'orphan.jpg', type: 'file', size: 1, mtime: 0, uri: '' },
        { name: 'nested', type: 'directory', size: 0, mtime: 0, uri: '' },
      ],
    });
    vi.mocked(Filesystem.deleteFile).mockResolvedValue();

    await expect(
      ReceiptStorageService.listOrphanedReceipts(['receipts/known.jpg'])
    ).resolves.toEqual(['receipts/orphan.jpg']);
    await expect(
      ReceiptStorageService.cleanupOrphans(['receipts/known.jpg'])
    ).resolves.toBe(1);

    expect(Filesystem.deleteFile).toHaveBeenCalledWith({
      path: 'receipts/orphan.jpg',
      directory: 'DATA',
    });
  });

  it('queries known paths, cleans orphans, and logs the deleted count', async () => {
    const repository = new InMemoryTransactionRepository();
    const pathsSpy = vi.spyOn(repository, 'getAllReceiptPaths').mockResolvedValue(['receipts/known.jpg']);
    const cleanupSpy = vi.spyOn(ReceiptStorageService, 'cleanupOrphans').mockResolvedValue(2);

    await runReceiptOrphanCleanup(repository);

    expect(pathsSpy).toHaveBeenCalledOnce();
    expect(cleanupSpy).toHaveBeenCalledWith(['receipts/known.jpg']);
    expect(logger.info).toHaveBeenCalledWith('Receipt orphan cleanup deleted 2 file(s).');
  });
});
