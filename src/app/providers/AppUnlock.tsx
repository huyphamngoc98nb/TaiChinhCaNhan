// REDESIGN: PIN screen - see prompt 20260522
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Delete, Fingerprint, LockKeyhole } from 'lucide-react';
import { authService } from '@/core/auth/auth.service';
import { useLanguage } from '@/shared/context/LanguageContext';

interface AppUnlockProps {
  onUnlocked: () => void;
}

const PIN_MIN_LENGTH = 6;
const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const PIN_ERROR_MESSAGE = 'Mã PIN không đúng';
const PIN_CLEAR_DELAY_MS = 750;
const DELETE_HOLD_DELAY_MS = 320;
const DELETE_REPEAT_MS = 80;
const PIN_KEY_BUTTON_CLASS =
  'flex aspect-square items-center justify-center rounded-2xl bg-white text-[26px] font-semibold text-[#16171D] shadow-[0_8px_22px_rgba(17,24,39,0.10),0_1px_2px_rgba(17,24,39,0.08)] transition-[transform,background-color,box-shadow] duration-100 active:scale-[0.94] active:bg-[#E7EEF8] active:shadow-[0_3px_10px_rgba(17,24,39,0.12)] disabled:opacity-50';
type UnlockMode = 'loading' | 'setup' | 'confirm' | 'unlock';

export function AppUnlock({ onUnlocked }: AppUnlockProps) {
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [mode, setMode] = useState<UnlockMode>('loading');
  const [error, setError] = useState<string | null>(null);
  const [shakeDots, setShakeDots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clearingError, setClearingError] = useState(false);
  const clearPinTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const deleteHoldTimerRef = useRef<number | null>(null);
  const deleteRepeatTimerRef = useRef<number | null>(null);
  const didLongDeleteRef = useRef(false);

  const canSubmit = pin.trim().length >= PIN_MIN_LENGTH;
  const inputLocked = submitting || clearingError;

  const appendPinDigit = useCallback((digit: string) => {
    if (inputLocked) return;
    setError(null);
    setPin((currentPin) => {
      if (currentPin.length >= PIN_MIN_LENGTH) return currentPin;
      return `${currentPin}${digit}`;
    });
  }, [inputLocked]);

  const removePinDigit = useCallback(() => {
    if (inputLocked) return;
    setError(null);
    setPin((currentPin) => currentPin.slice(0, -1));
  }, [inputLocked]);

  const showPinError = useCallback((message: string) => {
    if (clearPinTimerRef.current) window.clearTimeout(clearPinTimerRef.current);
    if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);

    setError(message);
    setClearingError(true);
    setShakeDots(true);

    shakeTimerRef.current = window.setTimeout(() => {
      setShakeDots(false);
      shakeTimerRef.current = null;
    }, 340);

    clearPinTimerRef.current = window.setTimeout(() => {
      setPin('');
      setClearingError(false);
      clearPinTimerRef.current = null;
    }, PIN_CLEAR_DELAY_MS);
  }, []);

  const stopDeleteHold = useCallback(() => {
    if (deleteHoldTimerRef.current) {
      window.clearTimeout(deleteHoldTimerRef.current);
      deleteHoldTimerRef.current = null;
    }
    if (deleteRepeatTimerRef.current) {
      window.clearInterval(deleteRepeatTimerRef.current);
      deleteRepeatTimerRef.current = null;
    }
  }, []);

  const startDeleteHold = useCallback(() => {
    if (inputLocked || pin.length === 0) return;

    didLongDeleteRef.current = false;
    stopDeleteHold();
    deleteHoldTimerRef.current = window.setTimeout(() => {
      didLongDeleteRef.current = true;
      removePinDigit();
      deleteRepeatTimerRef.current = window.setInterval(removePinDigit, DELETE_REPEAT_MS);
    }, DELETE_HOLD_DELAY_MS);
  }, [inputLocked, pin.length, removePinDigit, stopDeleteHold]);

  const handleDeleteClick = useCallback(() => {
    if (didLongDeleteRef.current) {
      didLongDeleteRef.current = false;
      return;
    }

    removePinDigit();
  }, [removePinDigit]);

  const unlockFromBiometrics = useCallback(async () => {
    try {
      const result = await authService.unlockWithBiometrics();
      if (result?.authenticated) {
        setPin('');
        onUnlocked();
      }
    } catch {
      // PIN remains available when biometric auth is canceled, unavailable, or not set up.
    }
  }, [onUnlocked]);

  const submitPin = useCallback(async () => {
    if (!canSubmit || inputLocked || mode === 'loading') return;

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
          setFirstPin('');
          setMode('setup');
          showPinError(t('app_lock.confirm_mismatch'));
          return;
        }
        await authService.setupPin(pin);
      } else {
        await authService.unlockWithPin(pin);
      }
      setPin('');
      setFirstPin('');
      onUnlocked();
    } catch {
      showPinError(PIN_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, firstPin, inputLocked, mode, onUnlocked, pin, showPinError, t]);

  useEffect(() => {
    let isMounted = true;
    let removeListener: (() => Promise<void>) | undefined;

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
            if (isMounted) void unlockFromBiometrics();
          } else if (isMounted && event.message) {
            setError(event.message);
          }
        });

        removeListener = listenerHandle ? () => listenerHandle.remove() : undefined;
      } catch {
        removeListener = undefined;
      }

      if (isMounted) await unlockFromBiometrics();
    }

    void subscribeToBiometrics();

    return () => {
      isMounted = false;
      if (removeListener) {
        void removeListener();
      }
    };
  }, [unlockFromBiometrics]);

  useEffect(() => {
    if (!error) return;

    const dismissTimer = window.setTimeout(() => {
      setError(null);
    }, 2000);

    return () => window.clearTimeout(dismissTimer);
  }, [error]);

  useEffect(() => {
    if (pin.length === PIN_MIN_LENGTH) {
      void submitPin();
    }
  }, [pin, submitPin]);

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
  }, [appendPinDigit, removePinDigit]);

  useEffect(() => {
    return () => {
      if (clearPinTimerRef.current) window.clearTimeout(clearPinTimerRef.current);
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
      stopDeleteHold();
    };
  }, [stopDeleteHold]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitPin();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F7] text-[#1A1B22]">
      <style>
        {`
          @keyframes pin-dot-row-shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-10px); }
            40% { transform: translateX(9px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(4px); }
          }
        `}
      </style>
      <main className="flex flex-1 items-center justify-center px-6 pb-6 pt-2">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[390px]"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
              <LockKeyhole
                size={30}
                strokeWidth={2.35}
                className="text-[#4A6FA5]"
                aria-hidden="true"
              />
            </div>

            <h1 className="text-center text-[24px] font-extrabold leading-[30px] text-[#1A1B22]">
              {mode === 'setup' ? t('app_lock.setup_title') : mode === 'confirm' ? t('app_lock.confirm_title') : t('app_lock.unlock_title')}
            </h1>
            <p className="mt-2 max-w-[260px] text-center text-[14px] font-normal leading-5 text-[#454653]">
              {mode === 'setup'
                ? t('app_lock.setup_desc')
                : mode === 'confirm'
                  ? t('app_lock.confirm_desc')
                  : t('app_lock.unlock_desc')}
            </p>
          </div>

          <input
            id="app-pin"
            value={pin}
            onChange={(event) => {
              const nextPin = event.target.value.replace(/\D/g, '').slice(0, PIN_MIN_LENGTH);
              setPin(nextPin);
            }}
            type="password"
            inputMode="numeric"
            autoComplete={mode === 'unlock' ? 'current-password' : 'new-password'}
            minLength={PIN_MIN_LENGTH}
            className="sr-only"
            disabled={inputLocked}
            aria-label={mode === 'unlock' ? 'PIN' : t('app_lock.new_pin')}
          />

          <div className="mt-9 flex min-h-[82px] flex-col items-center justify-center">
            <div
              className="flex h-12 items-center justify-center gap-[18px]"
              style={shakeDots ? { animation: 'pin-dot-row-shake 340ms ease-in-out' } : undefined}
              aria-hidden="true"
            >
              {Array.from({ length: PIN_MIN_LENGTH }).map((_, index) => {
                const isFilled = pin.length > index;

                return (
                  <span
                    key={index}
                    className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border transition-colors duration-150 ${
                      isFilled ? 'border-[#2F5F9D] bg-[#DCE8F7]' : 'border-[#C3CBD8] bg-[#EEF1F5]'
                    }`}
                  >
                    <span
                      className={`h-[14px] w-[14px] rounded-full bg-[#245A99] shadow-[0_2px_7px_rgba(36,90,153,0.30)] transition-all duration-200 ease-out ${
                        isFilled ? 'scale-100 opacity-100' : 'scale-[0.35] opacity-0'
                      }`}
                    />
                  </span>
                );
              })}
            </div>

            <p
              className={`mt-2 min-h-5 text-center text-[13px] font-semibold text-[#BA1A1A] transition-opacity duration-150 ${
                error ? 'opacity-100' : 'opacity-0'
              }`}
              role={error ? 'alert' : undefined}
            >
              {error ?? PIN_ERROR_MESSAGE}
            </p>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3">
            {PIN_KEYS.slice(0, 9).map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => appendPinDigit(digit)}
                disabled={inputLocked}
                className={PIN_KEY_BUTTON_CLASS}
                aria-label={`${t('app_lock.enter_digit')} ${digit}`}
              >
                {digit}
              </button>
            ))}

            <div aria-hidden="true" />

            <button
              type="button"
              onClick={() => appendPinDigit('0')}
              disabled={inputLocked}
              className={PIN_KEY_BUTTON_CLASS}
              aria-label={`${t('app_lock.enter_digit')} 0`}
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDeleteClick}
              onPointerDown={startDeleteHold}
              onPointerUp={stopDeleteHold}
              onPointerCancel={stopDeleteHold}
              onPointerLeave={stopDeleteHold}
              disabled={inputLocked || pin.length === 0}
              className={`${PIN_KEY_BUTTON_CLASS} text-[#20222A] disabled:opacity-40`}
              aria-label={t('app_lock.delete_digit')}
            >
              <Delete size={31} strokeWidth={2.35} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void unlockFromBiometrics()}
            disabled={inputLocked || mode !== 'unlock'}
            className="mx-auto mt-7 flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-bold text-[#2F5F9D] transition-[transform,background-color] duration-100 active:scale-[0.94] active:bg-[#E0EAF6] disabled:opacity-50"
            aria-label="Dùng sinh trắc học"
          >
            <Fingerprint size={27} strokeWidth={2.35} />
            <span>Dùng sinh trắc học</span>
          </button>
        </form>
      </main>
    </div>
  );
}
