import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import {
  getSQLiteEncryptionConfig,
  SQLITE_ENCRYPTION_CONFIG,
} from '@/core/db/sqlite/encryption';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
  },
}));

describe('SQLite encryption config', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.getPlatform).mockReset();
  });

  it('keeps web SQLite unencrypted because jeep-sqlite does not use native SQLCipher open', () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

    expect(getSQLiteEncryptionConfig()).toEqual({
      encrypted: false,
      mode: 'no-encryption',
      requiresNativeSecret: false,
    });
  });

  it('uses the application encryption switch on native platforms', () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

    expect(getSQLiteEncryptionConfig()).toEqual(SQLITE_ENCRYPTION_CONFIG);
    expect(getSQLiteEncryptionConfig()).toEqual({
      encrypted: true,
      mode: 'secret',
      requiresNativeSecret: true,
    });
  });
});
