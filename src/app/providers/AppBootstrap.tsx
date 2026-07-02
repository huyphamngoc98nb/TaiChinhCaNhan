import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
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
import {
  APP_LOCK_FORCE_UNLOCK_EVENT,
  APP_LOCK_RESUME_EVENT,
  APP_LOCK_SUSPEND_EVENT,
} from './app-lock-events';

interface AppBootstrapProps {
  children: ReactNode;
}

const MOBILE_IDLE_LOCK_TIMEOUT_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'input', 'scroll'] as const;

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
  const [isUnlocked, setIsUnlocked] = useState(() => !authService.requiresUnlock());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const isUnlockedRef = useRef(isUnlocked);
  const appLockSuspendedRef = useRef(false);

  const { showToast } = useToast();
  const { t } = useLanguage();
  const handlePersistFail = useCallback(() => {
    // Only warn on Web - native platforms use real SQLite, no saveToStore needed.
    if (Capacitor.getPlatform() !== 'web') return;
    showToast('Dữ liệu chưa được lưu vĩnh viễn. Vui lòng không tắt ứng dụng.', 'error');
  }, [showToast]);

  useWebPersistWarning(handlePersistFail);

  useEffect(() => {
    isUnlockedRef.current = isUnlocked;
  }, [isUnlocked]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const triggerAutoBackupCheck = useCallback(() => {
    void runAutoBackupIfDue();
  }, []);

  const lockApp = useCallback(() => {
    if (!authService.requiresUnlock() || appLockSuspendedRef.current || !isUnlockedRef.current) return;
    clearIdleTimer();
    setIsReady(false);
    setIsUnlocked(false);
  }, [clearIdleTimer]);

  const resetIdleTimer = useCallback(() => {
    if (
      !authService.requiresUnlock() ||
      appLockSuspendedRef.current ||
      Capacitor.getPlatform() === 'web' ||
      !isUnlockedRef.current
    ) {
      clearIdleTimer();
      return;
    }

    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(lockApp, MOBILE_IDLE_LOCK_TIMEOUT_MS);
  }, [clearIdleTimer, lockApp]);

  useEffect(() => {
    const suspendAppLock = () => {
      appLockSuspendedRef.current = true;
      clearIdleTimer();
    };
    const resumeAppLock = () => {
      appLockSuspendedRef.current = false;
      resetIdleTimer();
    };
    const forceUnlock = () => {
      appLockSuspendedRef.current = false;
      setIsUnlocked(true);
    };

    window.addEventListener(APP_LOCK_SUSPEND_EVENT, suspendAppLock);
    window.addEventListener(APP_LOCK_RESUME_EVENT, resumeAppLock);
    window.addEventListener(APP_LOCK_FORCE_UNLOCK_EVENT, forceUnlock);

    return () => {
      window.removeEventListener(APP_LOCK_SUSPEND_EVENT, suspendAppLock);
      window.removeEventListener(APP_LOCK_RESUME_EVENT, resumeAppLock);
      window.removeEventListener(APP_LOCK_FORCE_UNLOCK_EVENT, forceUnlock);
    };
  }, [clearIdleTimer, resetIdleTimer]);

  useEffect(() => {
    if (!isUnlocked) return;

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
  }, [isUnlocked, triggerAutoBackupCheck]);

  useEffect(() => {
    if (!isReady || !isUnlocked) return;

    let removeAppStateListener: (() => Promise<void>) | undefined;
    const listenerOptions: AddEventListenerOptions = { capture: true, passive: true };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        triggerAutoBackupCheck();
      }
    };

    async function registerAppStateListener() {
      const listener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          triggerAutoBackupCheck();
        }
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

  useEffect(() => {
    if (!authService.requiresUnlock() || Capacitor.getPlatform() === 'web') return;

    let removeAppStateListener: (() => Promise<void>) | undefined;
    const activityListenerOptions: AddEventListenerOptions = { capture: true, passive: true };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lockApp();
        return;
      }

      resetIdleTimer();
    };

    async function registerAppStateListener() {
      const listener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          lockApp();
          return;
        }

        resetIdleTimer();
      });

      removeAppStateListener = () => listener.remove();
    }

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, activityListenerOptions);
    });
    document.addEventListener('visibilitychange', handleVisibilityChange, activityListenerOptions);
    resetIdleTimer();
    void registerAppStateListener();

    return () => {
      clearIdleTimer();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer, activityListenerOptions);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange, activityListenerOptions);
      if (removeAppStateListener) {
        void removeAppStateListener();
      }
    };
  }, [clearIdleTimer, lockApp, resetIdleTimer]);

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

  if (!isUnlocked) {
    return <AppUnlock onUnlocked={() => setIsUnlocked(true)} />;
  }

  if (!isReady) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
