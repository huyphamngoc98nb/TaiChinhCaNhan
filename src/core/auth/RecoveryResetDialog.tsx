import { useState } from 'react';
import { recoveryService } from './recovery.service';
import { ResetLocalDataError } from '@/core/db/reset-local-data';
import { ImeTextInput } from '@/shared/components/ImeTextInput';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useBodyScrollLock } from '@/shared/hooks/useBodyScrollLock';

interface RecoveryResetDialogProps {
  onCancel: () => void;
  onReset: () => void;
}

export function RecoveryResetDialog({ onCancel, onReset }: RecoveryResetDialogProps) {
  const { t } = useLanguage();
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useBodyScrollLock(true);

  const canReset = acknowledged && confirmation === t('security.reset_confirmation');

  async function reset() {
    if (!canReset || resetting) return;
    setResetting(true);
    setError(null);
    try {
      await recoveryService.resetLocalData();
      recoveryService.completeResetNavigationState();
      onReset();
    } catch (resetError) {
      const stepMessage = resetError instanceof ResetLocalDataError
        ? ` (${resetError.step})`
        : '';
      setError(`${t('security.reset_failed')}${stepMessage}`);
      setResetting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[var(--overlay)] p-5 backdrop-blur-sm" onClick={onCancel}>
      <div className="max-h-[calc(100dvh-40px)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-lg font-bold text-text">{t('security.recovery_title')}</h2>
        <p className="mt-2 text-sm leading-5 text-muted">{t('security.recovery_explanation')}</p>
        <p className="mt-2 text-sm font-semibold leading-5 text-rose-500">{t('security.recovery_warning')}</p>

        <label className="mt-5 flex items-start gap-3 text-sm text-text">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1"
          />
          <span>{t('security.reset_acknowledgement')}</span>
        </label>

        <label className="mt-4 block text-sm font-semibold text-text" htmlFor="reset-confirmation">
          {t('security.reset_type_prompt')}
        </label>
        <ImeTextInput
          id="reset-confirmation"
          value={confirmation}
          onValueChange={setConfirmation}
          className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2 text-text"
          autoComplete="off"
        />

        {error && <p className="mt-3 text-sm font-semibold text-rose-500" role="alert">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} disabled={resetting} className="flex-1 rounded-xl border border-border px-4 py-3 font-semibold text-text">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={() => void reset()} disabled={!canReset || resetting} className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white disabled:opacity-40">
            {resetting ? t('common.processing') : t('security.reset_action')}
          </button>
        </div>
      </div>
    </div>
  );
}
