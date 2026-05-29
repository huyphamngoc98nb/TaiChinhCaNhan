import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { ErrorScreen } from '@/shared/components/ErrorScreen';
import { logger } from '@/core/telemetry/logger';
import { initDatabaseConnection } from '@/core/db/sqlite/connection';
import { runMigrations } from '@/core/db/migrations/migration-runner';
import { seedDefaultData } from '@/core/db/seed/default-categories';
import { authService } from '@/core/auth/auth.service';
import { runAutoBackupIfDue } from '@/modules/backup/services/auto-backup.service';
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

export function AppBootstrap({ children }: AppBootstrapProps) {
  const [isUnlocked, setIsUnlocked] = useState(() => !authService.requiresUnlock());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const isUnlockedRef = useRef(isUnlocked);
  const appLockSuspendedRef = useRef(false);

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
    return <ErrorScreen error={error} onRetry={() => window.location.reload()} />;
  }

  if (!isUnlocked) {
    return <AppUnlock onUnlocked={() => setIsUnlocked(true)} />;
  }

  if (!isReady) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
