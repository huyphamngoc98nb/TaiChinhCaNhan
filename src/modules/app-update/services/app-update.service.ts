import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { logger } from '@/core/telemetry/logger';
import type {
  AppUpdateCheckResult,
  AndroidUpdateCheckOptions,
  CurrentAppVersion,
  LatestAndroidRelease,
} from '../types/app-update.types';

export const DEFAULT_ANDROID_UPDATE_MANIFEST_URL =
  'https://huyphamngoc98nb.github.io/TaiChinhCaNhan/latest.json';

const SKIPPED_ANDROID_VERSION_CODE_KEY = 'app_update.skipped_android_version_code';
const UPDATE_LOG_CONTEXT = 'AppUpdate.check';
const BODY_SNIPPET_MAX_LENGTH = 500;

function getManifestUrl(): string {
  return (
    import.meta.env.VITE_ANDROID_UPDATE_MANIFEST_URL?.trim() ||
    DEFAULT_ANDROID_UPDATE_MANIFEST_URL
  );
}

function createBodySnippet(body: string): string {
  return body.length > BODY_SNIPPET_MAX_LENGTH
    ? body.slice(0, BODY_SNIPPET_MAX_LENGTH)
    : body;
}

function getErrorMetadata(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  if (error === undefined) return {};

  return {
    errorMessage: String(error),
  };
}

function getManifestDiagnostics(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const data = value as Record<string, unknown>;
  const diagnostics: Record<string, unknown> = {
    parsedKeys: Object.keys(data).slice(0, 25),
  };

  if (typeof data.versionName === 'string') {
    diagnostics.latestVersionName = data.versionName;
  }

  if (typeof data.versionCode === 'number') {
    diagnostics.latestVersionCode = data.versionCode;
  }

  return diagnostics;
}

function getCurrentVersionMetadata(current?: CurrentAppVersion | null): Record<string, unknown> {
  if (!current) return {};

  return {
    currentVersionName: current.versionName,
    currentVersionCode: current.versionCode,
  };
}

function warnUpdateCheck(
  message: string,
  metadata: Record<string, unknown>,
  error?: unknown,
): void {
  const options = {
    context: UPDATE_LOG_CONTEXT,
    metadata: {
      ...metadata,
      ...getErrorMetadata(error),
    },
  };

  if (error instanceof Error) {
    logger.warn(message, error, options);
    return;
  }

  logger.warn(message, options);
}

function noUpdateResult(
  status: AppUpdateCheckResult['status'],
  platform = Capacitor.getPlatform(),
  current: CurrentAppVersion | null = null,
  latest: LatestAndroidRelease | null = null,
): AppUpdateCheckResult {
  return {
    platform,
    current,
    latest,
    updateAvailable: false,
    mandatory: false,
    skipped: false,
    status,
  };
}

function parseVersionCode(build: string | number | undefined): number | null {
  if (typeof build === 'number' && Number.isInteger(build) && build > 0) {
    return build;
  }

  if (typeof build === 'string' && /^\d+$/.test(build.trim())) {
    const value = Number(build.trim());
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  return null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function normalizeLatestAndroidRelease(value: unknown): LatestAndroidRelease | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const data = value as Record<string, unknown>;

  if (
    data.platform !== 'android' ||
    typeof data.versionName !== 'string' ||
    data.versionName.trim() === '' ||
    typeof data.versionCode !== 'number' ||
    !Number.isInteger(data.versionCode) ||
    data.versionCode <= 0 ||
    typeof data.apkUrl !== 'string' ||
    data.apkUrl.trim() === ''
  ) {
    return null;
  }

  if (
    data.minSupportedVersionCode !== undefined &&
    (typeof data.minSupportedVersionCode !== 'number' ||
      !Number.isInteger(data.minSupportedVersionCode) ||
      data.minSupportedVersionCode <= 0)
  ) {
    return null;
  }

  if (data.mandatory !== undefined && typeof data.mandatory !== 'boolean') {
    return null;
  }

  if (data.sha256 !== undefined && typeof data.sha256 !== 'string') {
    return null;
  }

  if (data.releaseDate !== undefined && typeof data.releaseDate !== 'string') {
    return null;
  }

  if (data.releaseNotes !== undefined && !isStringArray(data.releaseNotes)) {
    return null;
  }

  return {
    platform: 'android',
    versionName: data.versionName.trim(),
    versionCode: data.versionCode,
    minSupportedVersionCode: data.minSupportedVersionCode,
    mandatory: data.mandatory,
    apkUrl: data.apkUrl.trim(),
    sha256: data.sha256,
    releaseDate: data.releaseDate,
    releaseNotes: data.releaseNotes,
  };
}

export async function getCurrentAppVersion(): Promise<CurrentAppVersion | null> {
  const platform = Capacitor.getPlatform();

  if (platform !== 'android') {
    return null;
  }

  try {
    const info = await App.getInfo();
    const versionCode = parseVersionCode(info.build);

    if (versionCode === null) {
      warnUpdateCheck('Could not parse Android build number.', {
        action: 'read-current-version',
        platform,
        manifestUrl: getManifestUrl(),
        status: 'invalid-current-version',
        rawVersion: info.version,
        rawBuild: info.build,
      });
      return null;
    }

    return {
      platform: 'android',
      versionName: info.version,
      versionCode,
      build: String(info.build),
    };
  } catch (error) {
    warnUpdateCheck(
      'Could not read current app version.',
      {
        action: 'read-current-version',
        platform,
        manifestUrl: getManifestUrl(),
        status: 'invalid-current-version',
      },
      error,
    );
    return null;
  }
}

export async function fetchLatestAndroidRelease(
  current: CurrentAppVersion | null = null,
): Promise<LatestAndroidRelease | null> {
  const manifestUrl = getManifestUrl();
  const platform = Capacitor.getPlatform();
  const baseMetadata = {
    action: 'fetch-manifest',
    platform,
    manifestUrl,
    ...getCurrentVersionMetadata(current),
  };

  try {
    const response = await fetch(manifestUrl, {
      cache: 'no-store',
    });

    let bodyText = '';
    try {
      bodyText = await response.text();
    } catch (error) {
      warnUpdateCheck(
        'Could not read Android update manifest response.',
        {
          ...baseMetadata,
          status: 'read-response-failed',
          httpStatus: response.status,
        },
        error,
      );
      return null;
    }

    if (!response.ok) {
      warnUpdateCheck('Android update manifest request failed.', {
        ...baseMetadata,
        status: 'http-error',
        httpStatus: response.status,
        bodySnippet: createBodySnippet(bodyText),
      });
      return null;
    }

    let parsedManifest: unknown;
    try {
      parsedManifest = JSON.parse(bodyText);
    } catch (error) {
      warnUpdateCheck(
        'Android update manifest JSON could not be parsed.',
        {
          ...baseMetadata,
          status: 'invalid-json',
          httpStatus: response.status,
          bodySnippet: createBodySnippet(bodyText),
        },
        error,
      );
      return null;
    }

    const manifest = normalizeLatestAndroidRelease(parsedManifest);

    if (!manifest) {
      warnUpdateCheck('Android update manifest is invalid.', {
        ...baseMetadata,
        ...getManifestDiagnostics(parsedManifest),
        status: 'invalid-manifest',
        httpStatus: response.status,
        bodySnippet: createBodySnippet(bodyText),
      });
      return null;
    }

    return manifest;
  } catch (error) {
    warnUpdateCheck(
      'Could not fetch Android update manifest.',
      {
        ...baseMetadata,
        status: 'fetch-failed',
      },
      error,
    );
    return null;
  }
}

export async function getSkippedVersionCode(): Promise<number | null> {
  const { value } = await Preferences.get({ key: SKIPPED_ANDROID_VERSION_CODE_KEY });
  const versionCode = parseVersionCode(value ?? undefined);

  return versionCode;
}

export async function markVersionSkipped(versionCode: number): Promise<void> {
  if (!Number.isInteger(versionCode) || versionCode <= 0) {
    warnUpdateCheck('Ignoring invalid skipped Android versionCode.', {
      action: 'mark-version-skipped',
      platform: Capacitor.getPlatform(),
      manifestUrl: getManifestUrl(),
      status: 'invalid-version-code',
      latestVersionCode: versionCode,
    });
    return;
  }

  await Preferences.set({
    key: SKIPPED_ANDROID_VERSION_CODE_KEY,
    value: String(versionCode),
  });
}

export async function clearSkippedVersion(): Promise<void> {
  await Preferences.remove({ key: SKIPPED_ANDROID_VERSION_CODE_KEY });
}

export async function checkForAndroidUpdate(
  options: AndroidUpdateCheckOptions = {}
): Promise<AppUpdateCheckResult> {
  const platform = Capacitor.getPlatform();

  if (platform !== 'android') {
    return noUpdateResult('unsupported-platform', platform);
  }

  const current = await getCurrentAppVersion();
  if (!current) {
    return noUpdateResult('invalid-current-version', platform);
  }

  const latest = await fetchLatestAndroidRelease(current);
  if (!latest) {
    return noUpdateResult('manifest-unavailable', platform, current);
  }

  const updateAvailable = latest.versionCode > current.versionCode;
  const mandatory = latest.mandatory === true;
  const skippedVersionCode = options.ignoreSkipped ? null : await getSkippedVersionCode();
  const skipped =
    !options.ignoreSkipped && !mandatory && updateAvailable && skippedVersionCode === latest.versionCode;

  return {
    platform,
    current,
    latest,
    updateAvailable,
    mandatory,
    skipped,
    status: updateAvailable ? 'update-available' : 'up-to-date',
  };
}

export function shouldPromptUpdate(result: AppUpdateCheckResult): boolean {
  if (!result.updateAvailable) return false;
  if (result.mandatory) return true;

  return !result.skipped;
}
