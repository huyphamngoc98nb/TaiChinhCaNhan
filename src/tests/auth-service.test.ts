import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { sqlite } from '@/core/db/sqlite/pragmas';
import { AuthService } from '@/core/auth/auth.service';
import { nativeBiometric } from '@/core/auth/native-biometric';

const preferencesMock = vi.hoisted(() => ({
  value: null as string | null,
  get: vi.fn(async () => ({ value: preferencesMock.value })),
  set: vi.fn(async ({ value }: { key: string; value: string }) => {
    preferencesMock.value = value;
  }),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
  },
}));

vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {
    addListener: vi.fn(),
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: preferencesMock.get,
    set: preferencesMock.set,
  },
}));

vi.mock('@/core/db/sqlite/pragmas', () => ({
  sqlite: {
    isSecretStored: vi.fn(),
    setEncryptionSecret: vi.fn(),
    checkEncryptionSecret: vi.fn(),
    isInConfigBiometricAuth: vi.fn(),
  },
}));

vi.mock('@/core/auth/native-biometric', () => ({
  nativeBiometric: {
    isAvailable: vi.fn(),
    authenticate: vi.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferencesMock.value = null;
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(nativeBiometric.isAvailable).mockResolvedValue({ available: true });
    vi.mocked(nativeBiometric.authenticate).mockResolvedValue({ authenticated: true });
  });

  it('does not require unlock on web', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

    const service = new AuthService();
    await expect(service.unlockWithPin('')).resolves.toEqual({
      authenticated: true,
      createdSecret: false,
    });
    expect(sqlite.setEncryptionSecret).not.toHaveBeenCalled();
    expect(sqlite.checkEncryptionSecret).not.toHaveBeenCalled();
  });

  it('stores first native PIN through setupPin', async () => {
    vi.mocked(sqlite.isSecretStored).mockResolvedValue({ result: false });

    const result = await new AuthService().setupPin('123456');

    expect(result).toEqual({ authenticated: true, createdSecret: true });
    expect(sqlite.setEncryptionSecret).toHaveBeenCalledWith('123456');
    expect(sqlite.checkEncryptionSecret).not.toHaveBeenCalled();
    expect(preferencesMock.set).toHaveBeenCalledWith({
      key: 'biometric_unlock_enabled',
      value: 'false',
    });
  });

  it('does not create a PIN from unlockWithPin when no secret exists', async () => {
    vi.mocked(sqlite.isSecretStored).mockResolvedValue({ result: false });

    await expect(new AuthService().unlockWithPin('123456')).rejects.toThrow('PIN has not been set up yet.');
    expect(sqlite.setEncryptionSecret).not.toHaveBeenCalled();
  });

  it('checks existing native secret before unlock succeeds', async () => {
    vi.mocked(sqlite.isSecretStored).mockResolvedValue({ result: true });
    vi.mocked(sqlite.checkEncryptionSecret).mockResolvedValue({ result: true });

    const result = await new AuthService().unlockWithPin('654321');

    expect(result).toEqual({ authenticated: true, createdSecret: false });
    expect(sqlite.setEncryptionSecret).not.toHaveBeenCalled();
    expect(sqlite.checkEncryptionSecret).toHaveBeenCalledWith('654321');
  });

  it('rejects invalid native PIN', async () => {
    vi.mocked(sqlite.isSecretStored).mockResolvedValue({ result: true });
    vi.mocked(sqlite.checkEncryptionSecret).mockResolvedValue({ result: false });

    await expect(new AuthService().unlockWithPin('654321')).rejects.toThrow('Invalid PIN');
  });

  it('does not unlock with biometrics when user setting is disabled', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    preferencesMock.value = 'false';

    await expect(new AuthService().unlockWithBiometrics()).resolves.toBeNull();
    expect(sqlite.isInConfigBiometricAuth).not.toHaveBeenCalled();
  });

  it('unlocks with biometrics when user setting is enabled and native biometric auth exposes a stored secret', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    preferencesMock.value = 'true';
    vi.mocked(sqlite.isInConfigBiometricAuth).mockResolvedValue({ result: true });
    vi.mocked(sqlite.isSecretStored).mockResolvedValue({ result: true });

    await expect(new AuthService().unlockWithBiometrics()).resolves.toEqual({
      authenticated: true,
      createdSecret: false,
    });
    expect(sqlite.checkEncryptionSecret).not.toHaveBeenCalled();
  });

  it('keeps PIN required when biometric auth has no stored secret yet', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    preferencesMock.value = 'true';
    vi.mocked(sqlite.isInConfigBiometricAuth).mockResolvedValue({ result: true });
    vi.mocked(sqlite.isSecretStored).mockResolvedValue({ result: false });

    await expect(new AuthService().unlockWithBiometrics()).resolves.toBeNull();
  });

  it('persists biometric unlock preference when available', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');
    vi.mocked(sqlite.isInConfigBiometricAuth).mockResolvedValue({ result: true });

    await new AuthService().setBiometricUnlockEnabled(true);

    expect(preferencesMock.set).toHaveBeenCalledWith({
      key: 'biometric_unlock_enabled',
      value: 'true',
    });
  });

  it('supports Android biometric unlock through the app-controlled native biometric plugin', async () => {
    preferencesMock.value = 'true';
    vi.mocked(sqlite.isSecretStored).mockResolvedValue({ result: true });

    await expect(new AuthService().isBiometricUnlockAvailable()).resolves.toBe(true);
    await expect(new AuthService().isBiometricUnlockEnabled()).resolves.toBe(true);
    await expect(new AuthService().unlockWithBiometrics()).resolves.toEqual({
      authenticated: true,
      createdSecret: false,
    });

    expect(sqlite.isInConfigBiometricAuth).not.toHaveBeenCalled();
    expect(sqlite.isSecretStored).toHaveBeenCalled();
    expect(nativeBiometric.authenticate).toHaveBeenCalledWith({
      title: 'Unlock Expense Tracker',
      subtitle: 'Verify before opening your encrypted database',
    });
  });

  it('persists Android biometric unlock preference after biometric verification succeeds', async () => {
    await new AuthService().setBiometricUnlockEnabled(true);

    expect(nativeBiometric.authenticate).toHaveBeenCalledWith({
      title: 'Enable biometric unlock',
      subtitle: 'Verify to use biometrics for app unlock',
    });
    expect(preferencesMock.set).toHaveBeenCalledWith({
      key: 'biometric_unlock_enabled',
      value: 'true',
    });
  });

  it('treats Android biometric unlock as unavailable when the native biometric plugin reports unavailable', async () => {
    preferencesMock.value = 'true';
    vi.mocked(nativeBiometric.isAvailable).mockResolvedValue({ available: false });

    await expect(new AuthService().isBiometricUnlockAvailable()).resolves.toBe(false);
    await expect(new AuthService().setBiometricUnlockEnabled(true)).rejects.toThrow(
      'Biometric unlock is not available on this device.',
    );

    expect(sqlite.isSecretStored).not.toHaveBeenCalled();
  });
});
