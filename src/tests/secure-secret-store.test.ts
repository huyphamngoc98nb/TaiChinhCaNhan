import { beforeEach, describe, expect, it, vi } from 'vitest';

const capacitorMocks = vi.hoisted(() => {
  const nativePlugin = {
    setSecret: vi.fn(),
    getSecret: vi.fn(),
    removeSecret: vi.fn(),
    hasSecret: vi.fn(),
  };

  return {
    nativePlugin,
    getPlatform: vi.fn(),
    registerPlugin: vi.fn(() => nativePlugin),
  };
});

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: capacitorMocks.getPlatform,
  },
  registerPlugin: capacitorMocks.registerPlugin,
}));

import {
  AUTO_BACKUP_PASSWORD_SECRET_KEY,
  isSecureSecretStoreAvailable,
  secureSecretStore,
} from '@/core/security/secure-secret-store';

describe('secure secret store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capacitorMocks.getPlatform.mockReturnValue('web');
    capacitorMocks.nativePlugin.setSecret.mockResolvedValue({ saved: true });
    capacitorMocks.nativePlugin.getSecret.mockResolvedValue({
      exists: true,
      value: 'super-secret',
    });
    capacitorMocks.nativePlugin.removeSecret.mockResolvedValue({ removed: true });
    capacitorMocks.nativePlugin.hasSecret.mockResolvedValue({ exists: true });
  });

  it('does not persist secrets on web fallback', async () => {
    await expect(
      secureSecretStore.setSecret({
        key: AUTO_BACKUP_PASSWORD_SECRET_KEY,
        value: 'super-secret',
      })
    ).resolves.toEqual({ saved: false });
    await expect(
      secureSecretStore.getSecret({ key: AUTO_BACKUP_PASSWORD_SECRET_KEY })
    ).resolves.toEqual({ exists: false });
    await expect(
      secureSecretStore.hasSecret({ key: AUTO_BACKUP_PASSWORD_SECRET_KEY })
    ).resolves.toEqual({ exists: false });
    await expect(
      secureSecretStore.removeSecret({ key: AUTO_BACKUP_PASSWORD_SECRET_KEY })
    ).resolves.toEqual({ removed: false });

    expect(isSecureSecretStoreAvailable()).toBe(false);
    expect(capacitorMocks.nativePlugin.setSecret).not.toHaveBeenCalled();
    expect(capacitorMocks.nativePlugin.getSecret).not.toHaveBeenCalled();
    expect(capacitorMocks.nativePlugin.hasSecret).not.toHaveBeenCalled();
    expect(capacitorMocks.nativePlugin.removeSecret).not.toHaveBeenCalled();
  });

  it('delegates to the native plugin on Android', async () => {
    capacitorMocks.getPlatform.mockReturnValue('android');

    await expect(
      secureSecretStore.setSecret({
        key: AUTO_BACKUP_PASSWORD_SECRET_KEY,
        value: 'super-secret',
      })
    ).resolves.toEqual({ saved: true });
    await expect(
      secureSecretStore.getSecret({ key: AUTO_BACKUP_PASSWORD_SECRET_KEY })
    ).resolves.toEqual({ exists: true, value: 'super-secret' });
    await expect(
      secureSecretStore.hasSecret({ key: AUTO_BACKUP_PASSWORD_SECRET_KEY })
    ).resolves.toEqual({ exists: true });
    await expect(
      secureSecretStore.removeSecret({ key: AUTO_BACKUP_PASSWORD_SECRET_KEY })
    ).resolves.toEqual({ removed: true });

    expect(isSecureSecretStoreAvailable()).toBe(true);
    expect(capacitorMocks.nativePlugin.setSecret).toHaveBeenCalledWith({
      key: AUTO_BACKUP_PASSWORD_SECRET_KEY,
      value: 'super-secret',
    });
  });
});
