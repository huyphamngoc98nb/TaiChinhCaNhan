import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppBootstrap } from '@/app/providers/AppBootstrap';

const authServiceMock = vi.hoisted(() => ({
  requiresUnlock: vi.fn(),
  hasStoredSecret: vi.fn(),
  isBiometricUnlockEnabled: vi.fn(),
  onBiometricResult: vi.fn(),
  unlockWithBiometrics: vi.fn(),
}));

const sqliteConnectionMock = vi.hoisted(() => ({
  initDatabaseConnection: vi.fn(),
}));

const migrationsMock = vi.hoisted(() => ({
  runMigrations: vi.fn(),
}));

const seedMock = vi.hoisted(() => ({
  seedDefaultData: vi.fn(),
}));

const autoBackupMock = vi.hoisted(() => ({
  runAutoBackupIfDue: vi.fn(),
}));

const capacitorMock = vi.hoisted(() => ({
  getPlatform: vi.fn(),
}));

const appLockClockMock = vi.hoisted(() => ({
  now: vi.fn(),
}));

const deviceLockMock = vi.hoisted(() => ({
  consumeSignal: vi.fn(),
  clearSignal: vi.fn(),
}));

const privacyShieldMock = vi.hoisted(() => ({
  hide: vi.fn(),
}));

const appLockTimeoutSettingsMock = vi.hoisted(() => ({
  getAppLockTimeoutMs: vi.fn(),
}));

const appListeners = vi.hoisted(() => ({
  appStateChange: [] as Array<(event: { isActive: boolean }) => void>,
}));

vi.mock('@/core/auth/auth.service', () => ({
  authService: authServiceMock,
}));

vi.mock('@/core/db/sqlite/connection', () => sqliteConnectionMock);
vi.mock('@/core/db/migrations/migration-runner', () => migrationsMock);
vi.mock('@/core/db/seed/default-categories', () => seedMock);
vi.mock('@/modules/backup/services/auto-backup.service', () => autoBackupMock);

vi.mock('@capacitor/core', () => ({
  Capacitor: capacitorMock,
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (eventName: string, callback: (event: { isActive: boolean }) => void) => {
      if (eventName === 'appStateChange') {
        appListeners.appStateChange.push(callback);
      }
      return {
        remove: vi.fn(async () => {
          appListeners.appStateChange = appListeners.appStateChange.filter((item) => item !== callback);
        }),
      };
    }),
  },
}));

vi.mock('@/app/providers/app-lock-clock', () => ({
  appLockClock: appLockClockMock,
}));

vi.mock('@/app/providers/device-lock', () => ({
  deviceLock: deviceLockMock,
}));

vi.mock('@/app/providers/privacy-shield', () => ({
  privacyShield: privacyShieldMock,
}));

vi.mock('@/modules/settings/services/app-lock-timeout-settings.service', () => (
  appLockTimeoutSettingsMock
));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/components/Toast/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('@/app/providers/AppUnlock', () => ({
  AppUnlock: ({ onUnlocked }: { onUnlocked: () => void }) => (
    <button type="button" onClick={onUnlocked}>
      PIN screen
    </button>
  ),
}));

function renderBootstrap(children = <div>Unlocked app</div>) {
  return render(
    <AppBootstrap>
      {children}
    </AppBootstrap>,
  );
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: hidden,
  });
}

function emitAppStateChange(
  event: { isActive: boolean },
  realBackground = true,
) {
  setDocumentHidden(event.isActive ? false : realBackground);
  appListeners.appStateChange.forEach((callback) => callback(event));
}

describe('AppBootstrap app lock', () => {
  let transactionCount: number;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    setDocumentHidden(false);
    appListeners.appStateChange = [];
    authServiceMock.requiresUnlock.mockReturnValue(true);
    authServiceMock.hasStoredSecret.mockResolvedValue(true);
    authServiceMock.isBiometricUnlockEnabled.mockResolvedValue(false);
    authServiceMock.onBiometricResult.mockResolvedValue(null);
    authServiceMock.unlockWithBiometrics.mockResolvedValue(null);
    sqliteConnectionMock.initDatabaseConnection.mockResolvedValue(undefined);
    migrationsMock.runMigrations.mockResolvedValue(undefined);
    seedMock.seedDefaultData.mockResolvedValue(undefined);
    capacitorMock.getPlatform.mockReturnValue('android');
    appLockClockMock.now.mockResolvedValue(0);
    deviceLockMock.consumeSignal.mockResolvedValue(false);
    deviceLockMock.clearSignal.mockResolvedValue(undefined);
    privacyShieldMock.hide.mockResolvedValue(undefined);
    appLockTimeoutSettingsMock.getAppLockTimeoutMs.mockResolvedValue(2 * 60 * 1000);
    transactionCount = 2;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not change transaction count during cold start', async () => {
    authServiceMock.requiresUnlock.mockReturnValue(false);

    renderBootstrap();
    await flushPromises();

    expect(sqliteConnectionMock.initDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(migrationsMock.runMigrations).toHaveBeenCalledTimes(1);
    expect(seedMock.seedDefaultData).toHaveBeenCalledTimes(1);
    expect(transactionCount).toBe(2);
  });

  it('keeps the current screen when the native app briefly goes inactive', async () => {
    renderBootstrap();

    expect(screen.getByText('PIN screen')).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    });
    await flushPromises();

    expect(screen.getByText('Unlocked app')).toBeTruthy();
    act(() => {
      emitAppStateChange({ isActive: false });
    });
    await flushPromises();

    expect(screen.getByText('Unlocked app')).toBeTruthy();
    expect(screen.getByTestId('privacy-shield')).toBeTruthy();

    act(() => {
      emitAppStateChange({ isActive: true });
    });
    await flushPromises();

    expect(screen.getByText('Unlocked app')).toBeTruthy();
    expect(screen.queryByTestId('privacy-shield')).toBeNull();
    expect(privacyShieldMock.hide).toHaveBeenCalled();
  });

  it('renders the lock screen on web when unlock is required', () => {
    capacitorMock.getPlatform.mockReturnValue('web');

    renderBootstrap();

    expect(screen.getByText('PIN screen')).toBeTruthy();
    expect(sqliteConnectionMock.initDatabaseConnection).not.toHaveBeenCalled();
  });

  it('does not reinitialize the database after a background round trip', async () => {
    renderBootstrap();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    });
    await flushPromises();

    expect(sqliteConnectionMock.initDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Unlocked app')).toBeTruthy();

    act(() => {
      emitAppStateChange({ isActive: false });
    });
    await flushPromises();
    act(() => {
      emitAppStateChange({ isActive: true });
    });
    await flushPromises();

    expect(sqliteConnectionMock.initDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Unlocked app')).toBeTruthy();
    expect(transactionCount).toBe(2);
  });

  it('does not create a transaction on resume across the first day of a month', async () => {
    vi.setSystemTime(new Date('2026-06-30T23:59:59'));
    renderBootstrap();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    });
    await flushPromises();

    vi.setSystemTime(new Date('2026-07-01T00:00:01'));
    act(() => {
      emitAppStateChange({ isActive: true });
    });
    await flushPromises();

    expect(autoBackupMock.runAutoBackupIfDue).toHaveBeenCalled();
    expect(transactionCount).toBe(2);
  });

  it('does not couple user activity events to App Lock', async () => {
    renderBootstrap();

    expect(screen.getByText('PIN screen')).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    });
    await flushPromises();
    expect(screen.getByText('Unlocked app')).toBeTruthy();

    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
      window.dispatchEvent(new Event('keydown'));
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(screen.getByText('Unlocked app')).toBeTruthy();
  });

  it('does not start a timeout for a system dialog or native activity', async () => {
    appLockTimeoutSettingsMock.getAppLockTimeoutMs.mockResolvedValue(0);
    renderBootstrap();
    fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    await flushPromises();

    act(() => {
      emitAppStateChange({ isActive: false }, false);
    });
    await flushPromises();
    act(() => {
      emitAppStateChange({ isActive: true });
    });
    await flushPromises();

    expect(appLockClockMock.now).not.toHaveBeenCalled();
    expect(screen.queryByText('PIN screen')).toBeNull();
    expect(screen.getByText('Unlocked app')).toBeTruthy();
  });

  it('requires unlock after two minutes in the background', async () => {
    appLockClockMock.now
      .mockResolvedValueOnce(1_000)
      .mockResolvedValueOnce(121_000);
    renderBootstrap();
    fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    await flushPromises();

    act(() => {
      emitAppStateChange({ isActive: false });
    });
    await flushPromises();
    act(() => {
      emitAppStateChange({ isActive: true });
    });
    await flushPromises();

    expect(screen.getByText('PIN screen')).toBeTruthy();
    expect(screen.getByText('Unlocked app')).toBeTruthy();
  });

  it('preserves in-progress form data across a timed lock', async () => {
    appLockClockMock.now
      .mockResolvedValueOnce(2_000)
      .mockResolvedValueOnce(122_000);
    renderBootstrap(<input aria-label="Draft amount" defaultValue="" />);
    fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    await flushPromises();

    const input = screen.getByRole('textbox', { name: 'Draft amount' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '250000' } });
    act(() => {
      emitAppStateChange({ isActive: false });
    });
    await flushPromises();
    act(() => {
      emitAppStateChange({ isActive: true });
    });
    await flushPromises();
    fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    await flushPromises();

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Draft amount' }).value).toBe(
      '250000',
    );
    expect(sqliteConnectionMock.initDatabaseConnection).toHaveBeenCalledTimes(1);
  });

  it('requires unlock immediately after a device-lock signal', async () => {
    appLockClockMock.now.mockResolvedValueOnce(10_000);
    deviceLockMock.consumeSignal.mockResolvedValueOnce(true);
    renderBootstrap();
    fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    await flushPromises();

    act(() => {
      emitAppStateChange({ isActive: false });
    });
    await flushPromises();
    act(() => {
      emitAppStateChange({ isActive: true });
    });
    await flushPromises();

    expect(screen.getByText('PIN screen')).toBeTruthy();
    expect(screen.getByText('Unlocked app')).toBeTruthy();
  });

  it('prioritizes device lock over a short background interval', async () => {
    appLockClockMock.now.mockResolvedValueOnce(30_000);
    deviceLockMock.consumeSignal.mockResolvedValueOnce(true);
    renderBootstrap();
    fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    await flushPromises();

    act(() => {
      emitAppStateChange({ isActive: false });
    });
    await flushPromises();
    act(() => {
      emitAppStateChange({ isActive: true });
    });
    await flushPromises();

    expect(appLockClockMock.now).toHaveBeenCalledTimes(1);
    expect(screen.getByText('PIN screen')).toBeTruthy();
  });

  it('prioritizes device lock when automatic timeout locking is disabled', async () => {
    appLockTimeoutSettingsMock.getAppLockTimeoutMs.mockResolvedValue(null);
    deviceLockMock.consumeSignal.mockResolvedValueOnce(true);
    renderBootstrap();
    fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    await flushPromises();

    act(() => {
      emitAppStateChange({ isActive: false });
    });
    await flushPromises();
    act(() => {
      emitAppStateChange({ isActive: true });
    });
    await flushPromises();

    expect(screen.getByText('PIN screen')).toBeTruthy();
  });

  it('unregisters lifecycle listeners when unmounted', async () => {
    const view = renderBootstrap();
    await flushPromises();
    expect(appListeners.appStateChange).toHaveLength(1);

    view.unmount();
    await flushPromises();

    expect(appListeners.appStateChange).toHaveLength(0);
  });
});
