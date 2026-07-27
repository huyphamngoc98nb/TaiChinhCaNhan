import { Preferences } from '@capacitor/preferences';

export type AppLockTimeoutSetting =
  | 'immediately'
  | '30_seconds'
  | '1_minute'
  | '2_minutes'
  | '5_minutes'
  | '15_minutes'
  | 'never';

export const DEFAULT_APP_LOCK_TIMEOUT_SETTING: AppLockTimeoutSetting = '2_minutes';
export const APP_LOCK_TIMEOUT_STORAGE_KEY = 'settings.app_lock.timeout';

export const APP_LOCK_TIMEOUT_OPTIONS: readonly AppLockTimeoutSetting[] = [
  'immediately',
  '30_seconds',
  '1_minute',
  '2_minutes',
  '5_minutes',
  '15_minutes',
  'never',
];

const TIMEOUT_MS: Record<AppLockTimeoutSetting, number | null> = {
  immediately: 0,
  '30_seconds': 30 * 1000,
  '1_minute': 60 * 1000,
  '2_minutes': 2 * 60 * 1000,
  '5_minutes': 5 * 60 * 1000,
  '15_minutes': 15 * 60 * 1000,
  never: null,
};

function normalizeTimeoutSetting(value: unknown): AppLockTimeoutSetting {
  return typeof value === 'string'
    && APP_LOCK_TIMEOUT_OPTIONS.includes(value as AppLockTimeoutSetting)
    ? value as AppLockTimeoutSetting
    : DEFAULT_APP_LOCK_TIMEOUT_SETTING;
}

export async function getAppLockTimeoutSetting(): Promise<AppLockTimeoutSetting> {
  try {
    const { value } = await Preferences.get({ key: APP_LOCK_TIMEOUT_STORAGE_KEY });
    return normalizeTimeoutSetting(value);
  } catch {
    return DEFAULT_APP_LOCK_TIMEOUT_SETTING;
  }
}

export async function getAppLockTimeoutMs(): Promise<number | null> {
  return TIMEOUT_MS[await getAppLockTimeoutSetting()];
}

export async function updateAppLockTimeoutSetting(
  value: AppLockTimeoutSetting,
): Promise<AppLockTimeoutSetting> {
  const normalized = normalizeTimeoutSetting(value);
  await Preferences.set({
    key: APP_LOCK_TIMEOUT_STORAGE_KEY,
    value: normalized,
  });
  return normalized;
}
