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

export function AppBootstrap({ children }: AppBootstrapProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    let isInitializing = false;

    async function initializeApp() {
      if (isInitializing) return;
      isInitializing = true;

      try {
        logger.info('AppBootstrap: Starting database initialization...');
        
        await initDatabaseConnection();
        await runMigrations();
        await seedDefaultData();
        
        logger.info('AppBootstrap: Initialization complete.');
        if (isMounted) setIsReady(true);
      } catch (err) {
        logger.error('AppBootstrap: Initialization failed', err);
        if (isMounted) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        isInitializing = false;
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
