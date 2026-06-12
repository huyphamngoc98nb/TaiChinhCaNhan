import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { RecoveryService } from '@/core/auth/recovery.service';
import {
  clearNativeEncryptionSecret,
  deleteLocalDatabase,
} from '@/core/db/reset-local-data';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn(),
  },
}));

vi.mock('@/core/db/reset-local-data', () => ({
  deleteLocalDatabase: vi.fn(),
  clearNativeEncryptionSecret: vi.fn(),
}));

describe('RecoveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the database, clears the secret, then disables biometric unlock', async () => {
    const calls: string[] = [];
    vi.mocked(deleteLocalDatabase).mockImplementation(async () => { calls.push('database'); });
    vi.mocked(clearNativeEncryptionSecret).mockImplementation(async () => { calls.push('secret'); });
    vi.mocked(Preferences.set).mockImplementation(async () => { calls.push('preference'); });

    await new RecoveryService().resetLocalData();

    expect(calls).toEqual(['database', 'secret', 'preference']);
  });

  it('does not report success or continue when database or secret removal fails', async () => {
    vi.mocked(deleteLocalDatabase).mockRejectedValueOnce(new Error('delete failed'));
    await expect(new RecoveryService().resetLocalData()).rejects.toThrow('delete failed');
    expect(clearNativeEncryptionSecret).not.toHaveBeenCalled();
    expect(Preferences.set).not.toHaveBeenCalled();

    vi.mocked(deleteLocalDatabase).mockResolvedValueOnce(undefined);
    vi.mocked(clearNativeEncryptionSecret).mockRejectedValueOnce(new Error('clear failed'));
    await expect(new RecoveryService().resetLocalData()).rejects.toThrow('clear failed');
    expect(Preferences.set).not.toHaveBeenCalled();
  });
});
