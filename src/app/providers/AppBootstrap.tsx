import { ReactNode, useState, useEffect } from 'react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { ErrorScreen } from '@/shared/components/ErrorScreen';
import { logger } from '@/core/telemetry/logger';
import { initDatabaseConnection } from '@/core/db/sqlite/connection';
import { runMigrations } from '@/core/db/migrations/migration-runner';
import { seedDefaultData } from '@/core/db/seed/default-categories';

interface AppBootstrapProps {
  children: ReactNode;
}

let globalInitPromise: Promise<void> | null = null;

export function AppBootstrap({ children }: AppBootstrapProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeApp() {
      if (globalInitPromise) {
        await globalInitPromise;
        if (isMounted) setIsReady(true);
        return;
      }

      globalInitPromise = (async () => {
        logger.info('AppBootstrap: Starting database initialization...');
        await initDatabaseConnection();
        await runMigrations();
        await seedDefaultData();
        logger.info('AppBootstrap: Initialization complete.');
      })();

      try {
        await globalInitPromise;
        if (isMounted) setIsReady(true);
      } catch (err) {
        logger.error('AppBootstrap: Initialization failed', err);
        if (isMounted) setError(err instanceof Error ? err : new Error(String(err)));
        globalInitPromise = null; // Allow retry
      }
    }

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return <ErrorScreen error={error} onRetry={() => window.location.reload()} />;
  }

  if (!isReady) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
