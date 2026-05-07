import { RouterProvider } from 'react-router-dom';
import { router } from '../router';
import { AppBootstrap } from './AppBootstrap';
import { ToastProvider } from '@/shared/components/Toast/ToastContext';
import { ConfirmProvider } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { LanguageProvider } from '@/shared/context/LanguageContext';

export function AppProvider() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppBootstrap>
            <RouterProvider router={router} />
          </AppBootstrap>
        </ConfirmProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
