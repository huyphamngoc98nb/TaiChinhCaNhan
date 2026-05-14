import { RouterProvider } from 'react-router-dom';
import { router } from '../router';
import { AppBootstrap } from './AppBootstrap';
import { ToastProvider } from '@/shared/components/Toast/ToastContext';
import { ConfirmProvider } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { LanguageProvider } from '@/shared/context/LanguageContext';
import { CurrencyProvider } from '@/shared/context/CurrencyContext';
import { ApkDownloadProgress } from '@/components/ApkDownloadProgress';
import { useApkDownload } from '@/hooks/useApkDownload';

function ApkDownloadOverlay() {
  const { state, dismiss } = useApkDownload();

  return <ApkDownloadProgress state={state} onDismiss={dismiss} />;
}

export function AppProvider() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppBootstrap>
              <RouterProvider router={router} />
              <ApkDownloadOverlay />
            </AppBootstrap>
          </ConfirmProvider>
        </ToastProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
