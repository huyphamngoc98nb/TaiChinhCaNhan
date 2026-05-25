import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppBootstrap } from '@/app/providers/AppBootstrap';
import { resumeAppLock, suspendAppLock } from '@/app/providers/app-lock-events';

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

const capacitorMock = vi.hoisted(() => ({
  getPlatform: vi.fn(),
}));

const appListeners = vi.hoisted(() => ({
  appStateChange: null as ((event: { isActive: boolean }) => void) | null,
}));

vi.mock('@/core/auth/auth.service', () => ({
  authService: authServiceMock,
}));

vi.mock('@/core/db/sqlite/connection', () => sqliteConnectionMock);
vi.mock('@/core/db/migrations/migration-runner', () => migrationsMock);
vi.mock('@/core/db/seed/default-categories', () => seedMock);

vi.mock('@capacitor/core', () => ({
  Capacitor: capacitorMock,
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (eventName: string, callback: (event: { isActive: boolean }) => void) => {
      if (eventName === 'appStateChange') {
        appListeners.appStateChange = callback;
      }
      return { remove: vi.fn(async () => undefined) };
    }),
  },
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/app/providers/AppUnlock', () => ({
  AppUnlock: ({ onUnlocked }: { onUnlocked: () => void }) => (
    <button type="button" onClick={onUnlocked}>
      PIN screen
    </button>
  ),
}));

function renderBootstrap() {
  return render(
    <AppBootstrap>
      <div>Unlocked app</div>
    </AppBootstrap>,
  );
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('AppBootstrap app lock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    appListeners.appStateChange = null;
    authServiceMock.requiresUnlock.mockReturnValue(true);
    authServiceMock.hasStoredSecret.mockResolvedValue(true);
    authServiceMock.isBiometricUnlockEnabled.mockResolvedValue(false);
    authServiceMock.onBiometricResult.mockResolvedValue(null);
    authServiceMock.unlockWithBiometrics.mockResolvedValue(null);
    sqliteConnectionMock.initDatabaseConnection.mockResolvedValue(undefined);
    migrationsMock.runMigrations.mockResolvedValue(undefined);
    seedMock.seedDefaultData.mockResolvedValue(undefined);
    capacitorMock.getPlatform.mockReturnValue('android');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('locks when the native app goes inactive', async () => {
    renderBootstrap();

    expect(screen.getByText('PIN screen')).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    });
    await flushPromises();

    expect(screen.getByText('Unlocked app')).toBeTruthy();
    act(() => {
      appListeners.appStateChange?.({ isActive: false });
    });

    expect(screen.getByText('PIN screen')).toBeTruthy();
  });

  it('does not lock while app locking is temporarily suspended', async () => {
    renderBootstrap();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    });
    await flushPromises();

    expect(screen.getByText('Unlocked app')).toBeTruthy();

    act(() => {
      suspendAppLock();
      appListeners.appStateChange?.({ isActive: false });
    });

    expect(screen.getByText('Unlocked app')).toBeTruthy();

    act(() => {
      resumeAppLock();
      appListeners.appStateChange?.({ isActive: false });
    });

    expect(screen.getByText('PIN screen')).toBeTruthy();
  });

  it('reinitializes the database after unlocking from native background lock', async () => {
    renderBootstrap();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    });
    await flushPromises();

    expect(sqliteConnectionMock.initDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Unlocked app')).toBeTruthy();

    act(() => {
      appListeners.appStateChange?.({ isActive: false });
    });
    expect(screen.getByText('PIN screen')).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    });
    await flushPromises();

    expect(sqliteConnectionMock.initDatabaseConnection).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Unlocked app')).toBeTruthy();
  });

  it('locks after mobile inactivity and resets the timer on activity', async () => {
    renderBootstrap();

    expect(screen.getByText('PIN screen')).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'PIN screen' }));
    });
    await flushPromises();
    expect(screen.getByText('Unlocked app')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(90_000);
      window.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(90_000);
    });
    expect(screen.getByText('Unlocked app')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText('PIN screen')).toBeTruthy();
  });
});
