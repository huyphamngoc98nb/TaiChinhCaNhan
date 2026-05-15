import { RouterProvider } from 'react-router-dom';
import { router } from '../router';
import { AppBootstrap } from './AppBootstrap';
import { ToastProvider } from '@/shared/components/Toast/ToastContext';
import { ConfirmProvider } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { LanguageProvider } from '@/shared/context/LanguageContext';
import { CurrencyProvider } from '@/shared/context/CurrencyContext';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';

export function AppProvider() {
  return (
    <GlobalErrorBoundary>
      <LanguageProvider>
        <CurrencyProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AppBootstrap>
                <RouterProvider router={router} />
              </AppBootstrap>
            </ConfirmProvider>
          </ToastProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </GlobalErrorBoundary>
  );
}
