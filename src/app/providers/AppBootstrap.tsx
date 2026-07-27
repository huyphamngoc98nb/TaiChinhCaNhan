import { ReactNode, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { logger } from '@/core/telemetry/logger';
import {
  DEFAULT_APP_ERROR_MESSAGE,
  logAppError,
  notifyAppError,
} from '@/core/telemetry/error.service';
import { initDatabaseConnection } from '@/core/db/sqlite/connection';
import { runMigrations } from '@/core/db/migrations/migration-runner';
import { seedDefaultData } from '@/core/db/seed/default-categories';
import { runLegacyReceiptCleanupOnce } from '@/core/files';
import { authService } from '@/core/auth/auth.service';
import { runAutoBackupIfDue } from '@/modules/backup/services/auto-backup.service';
import { useWebPersistWarning } from '@/core/db/sqlite/use-web-persist-warning';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { AppUnlock } from './AppUnlock';
import { createInitialAppLockState, reduceAppLockState } from './app-lock-state';
import { appLockClock } from './app-lock-clock';
import { BackgroundTimeoutTracker } from './app-lock-timeout';
import { deviceLock } from './device-lock';
import { PrivacyShield } from './PrivacyShield';
import { privacyShield } from './privacy-shield';
import { invalidateStepUpAuthentication } from '@/core/auth/step-up-authentication';
import { getAppLockTimeoutMs } from '@/modules/settings/services/app-lock-timeout-settings.service';

interface AppBootstrapProps {
  children: ReactNode;
}

let globalInitPromise: Promise<void> | null = null;
let hasStartedLegacyReceiptCleanup = false;

function startLegacyReceiptCleanup() {
  if (hasStartedLegacyReceiptCleanup) return;
  hasStartedLegacyReceiptCleanup = true;

  void runLegacyReceiptCleanupOnce()
    .then(({ completed, errors }) => {
      if (errors > 0) {
        logger.warn(`Legacy receipt cleanup completed with ${errors} error(s).`);
      } else if (!completed) {
        logger.warn('Legacy receipt cleanup did not complete.');
      }
    })
    .catch((error) => {
      logger.warn('Legacy receipt cleanup failed', error);
    });
}

export function AppBootstrap({ children }: AppBootstrapProps) {
  const [appLockState, dispatchAppLock] = useReducer(
    reduceAppLockState,
    authService.requiresUnlock(),
    createInitialAppLockState,
  );
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isPrivacyShieldVisible, setIsPrivacyShieldVisible] = useState(false);
  const timeoutTrackerRef = useRef(new BackgroundTimeoutTracker(appLockClock));
  const lifecycleQueueRef = useRef(Promise.resolve());
  const isUnlocked =
    appLockState === 'UNLOCKED_FOREGROUND' || appLockState === 'UNLOCKED_BACKGROUND';
  const requiresAuthentication =
    appLockState === 'LOCK_REQUIRED' || appLockState === 'AUTHENTICATING';

  const { showToast } = useToast();
  const { t } = useLanguage();
  const handlePersistFail = useCallback(() => {
    // Only warn on Web - native platforms use real SQLite, no saveToStore needed.
    if (Capacitor.getPlatform() !== 'web') return;
    showToast('Dữ liệu chưa được lưu vĩnh viễn. Vui lòng không tắt ứng dụng.', 'error');
  }, [showToast]);

  useWebPersistWarning(handlePersistFail);

  const triggerAutoBackupCheck = useCallback(() => {
    void runAutoBackupIfDue();
  }, []);

  const handleAuthenticationStarted = useCallback(() => {
    dispatchAppLock({ type: 'AUTHENTICATION_STARTED' });
  }, []);

  const handleAuthenticationFailed = useCallback(() => {
    dispatchAppLock({ type: 'AUTHENTICATION_FAILED' });
  }, []);

  const handleUnlocked = useCallback(() => {
    void (async () => {
      timeoutTrackerRef.current.reset();
      await deviceLock.clearSignal();
      dispatchAppLock({ type: 'AUTHENTICATION_SUCCEEDED' });
    })();
  }, []);

  useEffect(() => {
    if (!requiresAuthentication || !isPrivacyShieldVisible) return;

    void privacyShield.hide().finally(() => {
      setIsPrivacyShieldVisible(false);
    });
  }, [isPrivacyShieldVisible, requiresAuthentication]);

  useEffect(() => {
    if (!isUnlocked || isReady) return;

    let isMounted = true;

    async function initializeApp() {
      try {
        if (!globalInitPromise) {
          globalInitPromise = (async () => {
            logger.info('AppBootstrap: Starting database initialization...');
            await initDatabaseConnection();
            await runMigrations();
            startLegacyReceiptCleanup();
            await seedDefaultData();
            logger.info('AppBootstrap: Initialization complete.');
          })();
        }

        await globalInitPromise;
        if (isMounted) {
          setIsReady(true);
          triggerAutoBackupCheck();
        }
      } catch (err) {
        logger.error('AppBootstrap: Initialization failed', err);
        void notifyAppError(err, {
          screen: 'AppBootstrap',
          action: 'initializeApp',
          userMessage: DEFAULT_APP_ERROR_MESSAGE,
        });
        void logAppError(err, {
          screen: 'AppBootstrap',
          action: 'initializeApp',
          userMessage: DEFAULT_APP_ERROR_MESSAGE,
        });
        if (isMounted) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        globalInitPromise = null; // Allow foreground unlock to re-check native SQLite state.
      }
    }

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, [isReady, isUnlocked, triggerAutoBackupCheck]);

  useEffect(() => {
    let removeAppStateListener: (() => Promise<void>) | undefined;
    const listenerOptions: AddEventListenerOptions = { capture: true, passive: true };

    const queueLifecycleChange = (isActive: boolean) => {
      lifecycleQueueRef.current = lifecycleQueueRef.current.then(async () => {
        if (!isActive) {
          invalidateStepUpAuthentication();
          setIsPrivacyShieldVisible(true);
          dispatchAppLock({ type: 'APP_MOVED_TO_BACKGROUND' });
          const timeoutMs = await getAppLockTimeoutMs();
          // Capacitor can report inactive for a system dialog or native activity.
          // Only a hidden WebView starts a real background timeout interval.
          if (document.hidden) {
            await timeoutTrackerRef.current.recordBackgroundStarted(timeoutMs);
          }
          return;
        }

        const deviceWasLocked = await deviceLock.consumeSignal();
        if (deviceWasLocked) {
          timeoutTrackerRef.current.reset();
          dispatchAppLock({ type: 'DEVICE_LOCK_DETECTED' });
          return;
        }

        const shouldLock = await timeoutTrackerRef.current.consumeForegroundLockRequirement();
        if (shouldLock) {
          dispatchAppLock({ type: 'BACKGROUND_TIMEOUT_EXPIRED' });
          return;
        }

        dispatchAppLock({ type: 'APP_MOVED_TO_FOREGROUND' });
        await privacyShield.hide();
        setIsPrivacyShieldVisible(false);
        if (isReady && isUnlocked) triggerAutoBackupCheck();
      });
    };

    const handleVisibilityChange = () => {
      queueLifecycleChange(!document.hidden);
    };

    async function registerAppStateListener() {
      const listener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        queueLifecycleChange(isActive);
      });

      removeAppStateListener = () => listener.remove();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange, listenerOptions);
    void registerAppStateListener();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange, listenerOptions);
      if (removeAppStateListener) {
        void removeAppStateListener();
      }
    };
  }, [isReady, isUnlocked, triggerAutoBackupCheck]);

  if (error) {
    void error;
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-6 text-center text-text">
        <div className="w-full max-w-sm rounded-[16px] border border-border bg-surface p-5">
          <h1 className="text-[18px] font-bold">{t('common.app_error_title')}</h1>
          <p className="mt-2 text-[14px] text-muted">{DEFAULT_APP_ERROR_MESSAGE}</p>
          <button
            type="button"
            className="mt-4 rounded-[12px] bg-primary px-4 py-2 text-[14px] font-semibold text-white"
            onClick={() => window.location.reload()}
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const unlockScreen = (
    <AppUnlock
      onUnlocked={handleUnlocked}
      onAuthenticationStarted={handleAuthenticationStarted}
      onAuthenticationFailed={handleAuthenticationFailed}
    />
  );

  if (requiresAuthentication && !isReady) {
    return unlockScreen;
  }

  if (!isReady) {
    return <LoadingScreen />;
  }

  if (requiresAuthentication) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-[100] bg-bg">{unlockScreen}</div>
        {isPrivacyShieldVisible && <PrivacyShield />}
      </>
    );
  }

  return (
    <>
      {children}
      {isPrivacyShieldVisible && <PrivacyShield />}
    </>
  );
}
