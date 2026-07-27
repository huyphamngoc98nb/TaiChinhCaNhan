import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import {
  APP_LOCK_TIMEOUT_STORAGE_KEY,
  DEFAULT_APP_LOCK_TIMEOUT_SETTING,
  getAppLockTimeoutMs,
  getAppLockTimeoutSetting,
  updateAppLockTimeoutSetting,
} from './app-lock-timeout-settings.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

const getPreference = vi.mocked(Preferences.get);
const setPreference = vi.mocked(Preferences.set);

describe('App Lock timeout settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPreference.mockResolvedValue({ value: null });
    setPreference.mockResolvedValue(undefined);
  });

  it('uses two minutes when no setting has been saved', async () => {
    await expect(getAppLockTimeoutSetting()).resolves.toBe(DEFAULT_APP_LOCK_TIMEOUT_SETTING);
    await expect(getAppLockTimeoutMs()).resolves.toBe(2 * 60 * 1000);
  });

  it('falls back to two minutes for an invalid stored value', async () => {
    getPreference.mockResolvedValue({ value: 'invalid-timeout' });

    await expect(getAppLockTimeoutSetting()).resolves.toBe('2_minutes');
  });

  it('falls back to two minutes when preferences cannot be read', async () => {
    getPreference.mockRejectedValue(new Error('Preferences unavailable'));

    await expect(getAppLockTimeoutSetting()).resolves.toBe('2_minutes');
  });

  it.each([
    ['immediately', 0],
    ['30_seconds', 30_000],
    ['1_minute', 60_000],
    ['2_minutes', 120_000],
    ['5_minutes', 300_000],
    ['15_minutes', 900_000],
    ['never', null],
  ] as const)('maps %s to %s milliseconds', async (setting, expected) => {
    getPreference.mockResolvedValue({ value: setting });

    await expect(getAppLockTimeoutMs()).resolves.toBe(expected);
  });

  it('persists a supported timeout setting', async () => {
    await expect(updateAppLockTimeoutSetting('5_minutes')).resolves.toBe('5_minutes');
    expect(setPreference).toHaveBeenCalledWith({
      key: APP_LOCK_TIMEOUT_STORAGE_KEY,
      value: '5_minutes',
    });
  });
});
