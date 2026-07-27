import { RouterProvider } from 'react-router-dom';
import { router } from '../router';
import { AppBootstrap } from './AppBootstrap';
import { ToastProvider } from '@/shared/components/Toast/ToastContext';
import { ConfirmProvider } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { LanguageProvider } from '@/shared/context/LanguageContext';
import { CurrencyProvider } from '@/shared/context/CurrencyContext';
import { ThemeProvider } from '@/shared/context/ThemeContext';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';
import { useKeyboardSafeFocus } from '@/shared/hooks/useKeyboardSafeFocus';
import { AppUiPreferencesApplier } from '@/shared/components/AppUiPreferencesApplier';
import { AppUpdateGate } from '@/modules/app-update/components/AppUpdateGate';
import { StepUpAuthenticationProvider } from '@/core/auth/StepUpAuthenticationProvider';

export function AppProvider() {
  useKeyboardSafeFocus();

  return (
    <GlobalErrorBoundary>
      <ThemeProvider>
        <AppUiPreferencesApplier />
        <LanguageProvider>
          <CurrencyProvider>
            <ToastProvider>
              <ConfirmProvider>
                <StepUpAuthenticationProvider>
                  <AppBootstrap>
                    <AppUpdateGate />
                    <RouterProvider router={router} />
                  </AppBootstrap>
                </StepUpAuthenticationProvider>
              </ConfirmProvider>
            </ToastProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}
