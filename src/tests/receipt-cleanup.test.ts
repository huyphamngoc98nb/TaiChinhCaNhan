import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import {
  LEGACY_RECEIPT_CLEANUP_KEY,
  runLegacyReceiptCleanupOnce,
} from '@/core/files/legacy-receipt-cleanup';
import { logger } from '@/core/telemetry/logger';

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Filesystem: { rmdir: vi.fn() },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: { get: vi.fn(), set: vi.fn() },
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('legacy receipt cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue();
    vi.mocked(Filesystem.rmdir).mockResolvedValue();
  });

  it('removes only the legacy folder in app data and records completion', async () => {
    await expect(runLegacyReceiptCleanupOnce()).resolves.toEqual({
      completed: true,
      skipped: false,
      errors: 0,
    });

    expect(Filesystem.rmdir).toHaveBeenCalledWith({
      path: 'receipts',
      directory: Directory.Data,
      recursive: true,
    });
    expect(Preferences.set).toHaveBeenCalledWith({
      key: LEGACY_RECEIPT_CLEANUP_KEY,
      value: 'completed',
    });
  });

  it('does not touch the filesystem after cleanup has completed', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: 'completed' });

    await expect(runLegacyReceiptCleanupOnce()).resolves.toEqual({
      completed: true,
      skipped: true,
      errors: 0,
    });
    expect(Filesystem.rmdir).not.toHaveBeenCalled();
  });

  it('marks cleanup complete when the legacy folder is already absent', async () => {
    vi.mocked(Filesystem.rmdir).mockRejectedValue(new Error('Directory does not exist'));

    await expect(runLegacyReceiptCleanupOnce()).resolves.toMatchObject({ completed: true });
    expect(Preferences.set).toHaveBeenCalledOnce();
  });

  it('does not crash or mark completion when deletion fails', async () => {
    const error = new Error('Permission denied');
    vi.mocked(Filesystem.rmdir).mockRejectedValue(error);

    await expect(runLegacyReceiptCleanupOnce()).resolves.toEqual({
      completed: false,
      skipped: false,
      errors: 1,
    });
    expect(Preferences.set).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Could not remove the legacy receipt directory',
      error,
    );
  });
});
