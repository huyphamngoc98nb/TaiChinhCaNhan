import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { logger } from '@/core/telemetry/logger';
import {
  DEFAULT_ANDROID_UPDATE_MANIFEST_URL,
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

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

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

vi.mock('@/core/telemetry/logger', () => ({
  logger: loggerMock,
}));

function mockFetchText(body: string, ok = true, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      text: async () => body,
    })),
  );
}

function mockFetchJson(value: unknown, ok = true, status = 200) {
  mockFetchText(JSON.stringify(value), ok, status);
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
    vi.unstubAllEnvs();
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
    expect(logger.warn).not.toHaveBeenCalled();
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
    expect(logger.warn).toHaveBeenCalledWith(
      'Could not parse Android build number.',
      expect.objectContaining({
        context: 'AppUpdate.check',
        metadata: expect.objectContaining({
          action: 'read-current-version',
          platform: 'android',
          rawBuild: 'debug',
          rawVersion: '0.1.14',
          status: 'invalid-current-version',
        }),
      }),
    );
  });

  it('fetches and validates the latest Android release manifest', async () => {
    await expect(fetchLatestAndroidRelease()).resolves.toEqual(latestManifest());
  });

  it('uses the GitHub Pages manifest URL by default', async () => {
    expect(DEFAULT_ANDROID_UPDATE_MANIFEST_URL).toBe(
      'https://huyphamngoc98nb.github.io/TaiChinhCaNhan/latest.json',
    );

    await fetchLatestAndroidRelease();

    expect(fetch).toHaveBeenCalledWith(DEFAULT_ANDROID_UPDATE_MANIFEST_URL, {
      cache: 'no-store',
    });
  });

  it('allows VITE_ANDROID_UPDATE_MANIFEST_URL to override the default manifest URL', async () => {
    vi.stubEnv('VITE_ANDROID_UPDATE_MANIFEST_URL', ' https://example.com/custom-latest.json ');

    await fetchLatestAndroidRelease();

    expect(fetch).toHaveBeenCalledWith('https://example.com/custom-latest.json', {
      cache: 'no-store',
    });
  });

  it('returns no update when the latest manifest is invalid', async () => {
    mockFetchJson(latestManifest({ platform: 'ios' }));

    const result = await checkForAndroidUpdate();

    expect(result.status).toBe('manifest-unavailable');
    expect(result.updateAvailable).toBe(false);
    expect(result.current?.versionCode).toBe(114);
    expect(logger.warn).toHaveBeenCalledWith(
      'Android update manifest is invalid.',
      expect.objectContaining({
        context: 'AppUpdate.check',
        metadata: expect.objectContaining({
          action: 'fetch-manifest',
          currentVersionCode: 114,
          currentVersionName: '0.1.14',
          latestVersionCode: 115,
          latestVersionName: '0.1.15',
          manifestUrl: DEFAULT_ANDROID_UPDATE_MANIFEST_URL,
          parsedKeys: expect.arrayContaining(['platform', 'versionName', 'versionCode']),
          platform: 'android',
          status: 'invalid-manifest',
        }),
      }),
    );
  });

  it('does not crash when fetching the manifest fails', async () => {
    const error = new Error('network down');
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(error)));

    const result = await checkForAndroidUpdate();

    expect(result.status).toBe('manifest-unavailable');
    expect(result.updateAvailable).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      'Could not fetch Android update manifest.',
      error,
      expect.objectContaining({
        context: 'AppUpdate.check',
        metadata: expect.objectContaining({
          action: 'fetch-manifest',
          currentVersionCode: 114,
          currentVersionName: '0.1.14',
          errorMessage: 'network down',
          errorName: 'Error',
          manifestUrl: DEFAULT_ANDROID_UPDATE_MANIFEST_URL,
          platform: 'android',
          status: 'fetch-failed',
        }),
      }),
    );
  });

  it('logs HTTP status when the manifest request fails', async () => {
    mockFetchText('<html>not found</html>', false, 404);

    const result = await checkForAndroidUpdate();

    expect(result.status).toBe('manifest-unavailable');
    expect(logger.warn).toHaveBeenCalledWith(
      'Android update manifest request failed.',
      expect.objectContaining({
        context: 'AppUpdate.check',
        metadata: expect.objectContaining({
          action: 'fetch-manifest',
          bodySnippet: '<html>not found</html>',
          httpStatus: 404,
          manifestUrl: DEFAULT_ANDROID_UPDATE_MANIFEST_URL,
          platform: 'android',
          status: 'http-error',
        }),
      }),
    );
  });

  it('logs invalid JSON without throwing', async () => {
    mockFetchText('<html>not json</html>');

    const result = await checkForAndroidUpdate();

    expect(result.status).toBe('manifest-unavailable');
    expect(logger.warn).toHaveBeenCalledWith(
      'Android update manifest JSON could not be parsed.',
      expect.any(SyntaxError),
      expect.objectContaining({
        context: 'AppUpdate.check',
        metadata: expect.objectContaining({
          action: 'fetch-manifest',
          bodySnippet: '<html>not json</html>',
          errorName: 'SyntaxError',
          httpStatus: 200,
          manifestUrl: DEFAULT_ANDROID_UPDATE_MANIFEST_URL,
          platform: 'android',
          status: 'invalid-json',
        }),
      }),
    );
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
