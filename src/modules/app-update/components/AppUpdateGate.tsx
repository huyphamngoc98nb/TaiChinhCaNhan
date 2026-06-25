import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/core/telemetry/logger';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import {
  DEFAULT_ANDROID_UPDATE_MANIFEST_URL,
  checkForAndroidUpdate,
  shouldPromptUpdate,
} from '../services/app-update.service';
import { useAppUpdatePrompt } from '../hooks/useAppUpdatePrompt';

function getManifestUrlForDiagnostics(): string {
  return (
    import.meta.env.VITE_ANDROID_UPDATE_MANIFEST_URL?.trim() ||
    DEFAULT_ANDROID_UPDATE_MANIFEST_URL
  );
}

export function AppUpdateGate() {
  const hasCheckedRef = useRef(false);
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { promptForUpdate } = useAppUpdatePrompt();

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    let isMounted = true;

    async function checkUpdate() {
      try {
        const result = await checkForAndroidUpdate();
        if (!isMounted || !shouldPromptUpdate(result) || !result.latest) return;

        await promptForUpdate(result);
      } catch (error) {
        logger.warn('Android update auto-check failed unexpectedly.', error, {
          context: 'AppUpdate.check',
          metadata: {
            action: 'auto-check-on-open',
            platform: Capacitor.getPlatform(),
            manifestUrl: getManifestUrlForDiagnostics(),
            status: 'unexpected-error',
          },
        });

        if (isMounted) {
          showToast(t('app_update.checking_update_failed'), 'error');
        }
      }
    }

    void checkUpdate();

    return () => {
      isMounted = false;
    };
  }, [promptForUpdate, showToast, t]);

  return null;
}
