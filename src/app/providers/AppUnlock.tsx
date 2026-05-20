import { FormEvent, useEffect, useState } from 'react';
import { Delete } from 'lucide-react';
import { authService } from '@/core/auth/auth.service';
import { useLanguage } from '@/shared/context/LanguageContext';

interface AppUnlockProps {
  onUnlocked: () => void;
}

const PIN_MIN_LENGTH = 6;
const PIN_MAX_LENGTH = 12;
const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
type UnlockMode = 'loading' | 'setup' | 'confirm' | 'unlock';

export function AppUnlock({ onUnlocked }: AppUnlockProps) {
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [mode, setMode] = useState<UnlockMode>('loading');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = pin.trim().length >= PIN_MIN_LENGTH;

  function appendPinDigit(digit: string) {
    if (submitting) return;
    setError(null);
    setPin((currentPin) => {
      if (currentPin.length >= PIN_MAX_LENGTH) return currentPin;
      return `${currentPin}${digit}`;
    });
  }

  function removePinDigit() {
    if (submitting) return;
    setError(null);
    setPin((currentPin) => currentPin.slice(0, -1));
  }

  useEffect(() => {
    let isMounted = true;
    let removeListener: (() => Promise<void>) | undefined;

    async function unlockFromBiometrics() {
      try {
        const result = await authService.unlockWithBiometrics();
        if (isMounted && result?.authenticated) {
          setPin('');
          onUnlocked();
        }
      } catch {
        // PIN remains available when biometric auth is canceled, unavailable, or not set up.
      }
    }

    async function subscribeToBiometrics() {
      let hasSecret = false;
      try {
        hasSecret = await authService.hasStoredSecret();
      } catch {
        hasSecret = false;
      }
      if (!isMounted) return;

      setMode(hasSecret ? 'unlock' : 'setup');
      if (!hasSecret) return;

      const biometricUnlockEnabled = await authService.isBiometricUnlockEnabled();
      if (!isMounted || !biometricUnlockEnabled) return;

      try {
        const listenerHandle = await authService.onBiometricResult((event) => {
          if (event.result) {
            void unlockFromBiometrics();
          } else if (isMounted && event.message) {
            setError(event.message);
          }
        });

        removeListener = listenerHandle ? () => listenerHandle.remove() : undefined;
      } catch {
        removeListener = undefined;
      }

      await unlockFromBiometrics();
    }

    void subscribeToBiometrics();

    return () => {
      isMounted = false;
      if (removeListener) {
        void removeListener();
      }
    };
  }, [onUnlocked]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        appendPinDigit(event.key);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        removePinDigit();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    if (mode === 'setup') {
      setFirstPin(pin);
      setPin('');
      setError(null);
      setMode('confirm');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (mode === 'confirm') {
        if (pin !== firstPin) {
          setPin('');
          setFirstPin('');
          setMode('setup');
          setError(t('app_lock.confirm_mismatch'));
          return;
        }
        await authService.setupPin(pin);
      } else {
        await authService.unlockWithPin(pin);
      }
      setPin('');
      setFirstPin('');
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app_lock.unlock_error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-5 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[18px] bg-white p-5 shadow-sm border border-gray-100"
      >
        <h1 className="text-[22px] font-bold text-gray-900 mb-2">
          {mode === 'setup' ? t('app_lock.setup_title') : mode === 'confirm' ? t('app_lock.confirm_title') : t('app_lock.unlock_title')}
        </h1>
        <p className="text-[13px] text-gray-500 mb-6">
          {mode === 'setup'
            ? t('app_lock.setup_desc')
            : mode === 'confirm'
              ? t('app_lock.confirm_desc')
              : t('app_lock.unlock_desc')}
        </p>

        <input
          id="app-pin"
          value={pin}
          onChange={(event) => {
            const nextPin = event.target.value.replace(/\D/g, '').slice(0, PIN_MAX_LENGTH);
            setPin(nextPin);
          }}
          type="password"
          inputMode="numeric"
          autoComplete={mode === 'unlock' ? 'current-password' : 'new-password'}
          minLength={PIN_MIN_LENGTH}
          className="sr-only"
          disabled={submitting}
          aria-label={mode === 'unlock' ? 'PIN' : t('app_lock.new_pin')}
        />

        <div className="flex h-12 items-center justify-center gap-3" aria-hidden="true">
          {Array.from({ length: PIN_MIN_LENGTH }).map((_, index) => (
            <span
              key={index}
              className={`h-3 w-3 rounded-full border transition-colors ${
                pin.length > index ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mt-3 min-h-4 text-center text-[12px] text-red-500">{error}</p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3">
          {PIN_KEYS.slice(0, 9).map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => appendPinDigit(digit)}
              disabled={submitting}
              className="flex aspect-square items-center justify-center rounded-[8px] border border-gray-200 bg-gray-50 text-[24px] font-semibold text-gray-900 transition active:scale-[0.98] active:bg-gray-100 disabled:opacity-50"
              aria-label={`${t('app_lock.enter_digit')} ${digit}`}
            >
              {digit}
            </button>
          ))}

          <div aria-hidden="true" />

          <button
            type="button"
            onClick={() => appendPinDigit('0')}
            disabled={submitting}
            className="flex aspect-square items-center justify-center rounded-[8px] border border-gray-200 bg-gray-50 text-[24px] font-semibold text-gray-900 transition active:scale-[0.98] active:bg-gray-100 disabled:opacity-50"
            aria-label={`${t('app_lock.enter_digit')} 0`}
          >
            0
          </button>

          <button
            type="button"
            onClick={removePinDigit}
            disabled={submitting || pin.length === 0}
            className="flex aspect-square items-center justify-center rounded-[8px] border border-gray-200 bg-white text-gray-700 transition active:scale-[0.98] active:bg-gray-100 disabled:opacity-40"
            aria-label={t('app_lock.delete_digit')}
          >
            <Delete size={24} strokeWidth={2.2} />
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting || !canSubmit || mode === 'loading'}
          className="mt-5 h-12 w-full rounded-[8px] bg-indigo-500 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {submitting
            ? t('app_lock.verifying')
            : mode === 'setup'
              ? t('app_lock.continue')
              : mode === 'confirm'
                ? t('app_lock.setup_title')
                : t('app_lock.unlock_title')}
        </button>
      </form>
    </div>
  );
}
