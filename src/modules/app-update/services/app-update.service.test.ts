import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import {
  checkForAndroidUpdate,
  clearSkippedVersion,
  fetchLatestAndroidRelease,
  getCurrentAppVersion,
  getSkippedVersionCode,
  markVersionSkipped,
  shouldPromptUpdate,
} from './app-update.service';

const preferencesMock = vi.hoisted(() => {
  const values = new Map<string, string>();

  return {
    values,
    get: vi.fn(async ({ key }: { key: string }) => ({ value: values.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      values.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      values.delete(key);
    }),
  };
});

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: vi.fn(),
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: preferencesMock.get,
    set: preferencesMock.set,
    remove: preferencesMock.remove,
  },
}));

function mockFetchJson(value: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      json: async () => value,
    })),
  );
}

function latestManifest(overrides: Record<string, unknown> = {}) {
  return {
    platform: 'android',
    versionName: '0.1.15',
    versionCode: 115,
    minSupportedVersionCode: 100,
    mandatory: false,
    apkUrl:
      'https://github.com/huyphamngoc98nb/TaiChinhCaNhan/releases/download/v0.1.15/TaiChinhCaNhan-v0.1.15.apk',
    sha256: 'abc123',
    releaseDate: '2026-06-24',
    releaseNotes: ['Fix backup flow'],
    ...overrides,
  };
}

describe('app update service', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    preferencesMock.values.clear();
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(App.getInfo).mockResolvedValue({
      name: 'TaiChinhCaNhan',
      id: 'com.taixiucanhan.app',
      version: '0.1.14',
      build: '114',
    });
    mockFetchJson(latestManifest());
  });

  it('returns no update on web without reading native app info or fetching manifest', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');

    const result = await checkForAndroidUpdate();

    expect(result).toMatchObject({
      platform: 'web',
      current: null,
      latest: null,
      updateAvailable: false,
      mandatory: false,
      skipped: false,
      status: 'unsupported-platform',
    });
    expect(App.getInfo).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reads the current Android version from Capacitor App info', async () => {
    await expect(getCurrentAppVersion()).resolves.toEqual({
      platform: 'android',
      versionName: '0.1.14',
      versionCode: 114,
      build: '114',
    });
  });

  it('returns no update when the current Android build is not numeric', async () => {
    vi.mocked(App.getInfo).mockResolvedValue({
      name: 'TaiChinhCaNhan',
      id: 'com.taixiucanhan.app',
      version: '0.1.14',
      build: 'debug',
    });

    const result = await checkForAndroidUpdate();

    expect(result.status).toBe('invalid-current-version');
    expect(result.updateAvailable).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches and validates the latest Android release manifest', async () => {
    await expect(fetchLatestAndroidRelease()).resolves.toEqual(latestManifest());
  });

  it('returns no update when the latest manifest is invalid', async () => {
    mockFetchJson(latestManifest({ platform: 'ios' }));

    const result = await checkForAndroidUpdate();

    expect(result.status).toBe('manifest-unavailable');
    expect(result.updateAvailable).toBe(false);
    expect(result.current?.versionCode).toBe(114);
  });

  it('does not crash when fetching the manifest fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    const result = await checkForAndroidUpdate();

    expect(result.status).toBe('manifest-unavailable');
    expect(result.updateAvailable).toBe(false);
  });

  it('detects an available optional update and prompts when it is not skipped', async () => {
    const result = await checkForAndroidUpdate();

    expect(result.updateAvailable).toBe(true);
    expect(result.mandatory).toBe(false);
    expect(result.skipped).toBe(false);
    expect(shouldPromptUpdate(result)).toBe(true);
  });

  it('returns no update when latest versionCode matches current versionCode', async () => {
    mockFetchJson(latestManifest({ versionName: '0.1.14', versionCode: 114 }));

    const result = await checkForAndroidUpdate();

    expect(result.status).toBe('up-to-date');
    expect(result.updateAvailable).toBe(false);
    expect(shouldPromptUpdate(result)).toBe(false);
  });

  it('returns no update when latest versionCode is lower than current versionCode', async () => {
    mockFetchJson(latestManifest({ versionName: '0.1.13', versionCode: 113 }));

    const result = await checkForAndroidUpdate();

    expect(result.status).toBe('up-to-date');
    expect(result.updateAvailable).toBe(false);
    expect(shouldPromptUpdate(result)).toBe(false);
  });

  it('does not prompt again for an optional update skipped by versionCode', async () => {
    await markVersionSkipped(115);

    const result = await checkForAndroidUpdate();

    expect(result.updateAvailable).toBe(true);
    expect(result.skipped).toBe(true);
    expect(shouldPromptUpdate(result)).toBe(false);
  });

  it('ignores skipped versionCode when requested for manual checks', async () => {
    await markVersionSkipped(115);

    const result = await checkForAndroidUpdate({ ignoreSkipped: true });

    expect(result.updateAvailable).toBe(true);
    expect(result.skipped).toBe(false);
    expect(shouldPromptUpdate(result)).toBe(true);
  });

  it('prompts again when the latest optional version differs from the skipped versionCode', async () => {
    await markVersionSkipped(115);
    mockFetchJson(latestManifest({ versionName: '0.1.16', versionCode: 116 }));

    const result = await checkForAndroidUpdate();

    expect(result.updateAvailable).toBe(true);
    expect(result.skipped).toBe(false);
    expect(shouldPromptUpdate(result)).toBe(true);
  });

  it('always prompts for mandatory updates even if the version was skipped before', async () => {
    await markVersionSkipped(115);
    mockFetchJson(latestManifest({ mandatory: true }));

    const result = await checkForAndroidUpdate();

    expect(result.mandatory).toBe(true);
    expect(result.skipped).toBe(false);
    expect(shouldPromptUpdate(result)).toBe(true);
  });

  it('stores and clears the skipped versionCode with Preferences', async () => {
    await markVersionSkipped(115);

    await expect(getSkippedVersionCode()).resolves.toBe(115);
    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'app_update.skipped_android_version_code',
      value: '115',
    });

    await clearSkippedVersion();

    await expect(getSkippedVersionCode()).resolves.toBeNull();
    expect(Preferences.remove).toHaveBeenCalledWith({
      key: 'app_update.skipped_android_version_code',
    });
  });
});
