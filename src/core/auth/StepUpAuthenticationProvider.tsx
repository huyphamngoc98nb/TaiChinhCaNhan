import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, ShieldCheck, X } from 'lucide-react';
import { authService } from './auth.service';
import {
  registerStepUpAuthenticationHandler,
  registerStepUpAuthenticationInvalidationHandler,
  type StepUpAuthenticationAction,
  type StepUpAuthenticationResult,
} from './step-up-authentication';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useSecureScreen } from '@/shared/hooks/useSecureScreen';

interface PendingRequest {
  action: StepUpAuthenticationAction;
  resolve: (result: StepUpAuthenticationResult) => void;
}

export function StepUpAuthenticationProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pendingRef = useRef<PendingRequest | null>(null);
  useSecureScreen(pending !== null);

  const finish = useCallback((result: StepUpAuthenticationResult) => {
    const request = pendingRef.current;
    if (!request) return;
    pendingRef.current = null;
    setPending(null);
    setPin('');
    setError(null);
    setSubmitting(false);
    request.resolve(result);
  }, []);

  const tryBiometrics = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const enabled = await authService.isBiometricUnlockEnabled();
      if (!enabled) {
        setSubmitting(false);
        return;
      }
      const result = await authService.unlockWithBiometrics();
      if (result?.authenticated) {
        finish('SUCCESS');
        return;
      }
      setSubmitting(false);
    } catch {
      setSubmitting(false);
    }
  }, [finish]);

  useEffect(() => registerStepUpAuthenticationHandler((action) => {
    if (!authService.requiresUnlock()) return Promise.resolve('SUCCESS');

    return new Promise((resolve) => {
      const request = { action, resolve };
      pendingRef.current = request;
      setPending(request);
      setPin('');
      setError(null);
      void tryBiometrics();
    });
  }), [tryBiometrics]);

  useEffect(
    () => registerStepUpAuthenticationInvalidationHandler(() => finish('CANCELLED')),
    [finish],
  );

  async function submitPin() {
    if (pin.trim().length < 6 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await authService.unlockWithPin(pin);
      finish(result.authenticated ? 'SUCCESS' : 'FAILED');
    } catch {
      setSubmitting(false);
      setError(t('app_lock.invalid_pin'));
    }
  }

  return (
    <>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-[var(--overlay)] p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-primary" size={22} />
                <h2 className="text-lg font-bold text-text">{t('app_lock.unlock_title')}</h2>
              </div>
              <button
                type="button"
                onClick={() => finish('CANCELLED')}
                aria-label={t('common.close')}
                disabled={submitting}
              >
                <X size={22} />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted">{t('app_lock.unlock_desc')}</p>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submitPin();
              }}
              aria-label="PIN"
              className="mt-5 w-full rounded-xl border border-border bg-bg px-4 py-3 text-center text-xl tracking-[0.4em] text-text"
              disabled={submitting}
              autoFocus
            />
            {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-500">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => void tryBiometrics()}
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 font-semibold text-text disabled:opacity-50"
              >
                <Fingerprint size={18} />
                {t('app_lock.use_biometrics')}
              </button>
              <button
                type="button"
                onClick={() => void submitPin()}
                disabled={submitting || pin.length < 6}
                className="flex-1 rounded-xl bg-primary px-3 py-3 font-semibold text-white disabled:opacity-50"
              >
                {t('app_lock.unlock_title')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
