import { useState } from 'react';
import { KeyRound, ShieldCheck, Trash2, X } from 'lucide-react';
import { authService } from '@/core/auth/auth.service';
import { RecoveryResetDialog } from '@/core/auth/RecoveryResetDialog';
import { useLanguage } from '@/shared/context/LanguageContext';
import { translations } from '@/shared/constants/translations';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { BiometricUnlockSettings } from './BiometricUnlockSettings';

export function SecuritySettings() {
  const { t } = useLanguage();
  const toast = useToast();
  const nativeSecurity = authService.requiresUnlock();
  const [showChangePin, setShowChangePin] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  async function changePin() {
    if (newPin.length < 6) {
      toast.error(t('security.pin_too_short'));
      return;
    }
    if (newPin !== confirmPin) {
      toast.error(t('security.pin_mismatch'));
      return;
    }

    setSaving(true);
    try {
      await authService.changePin(currentPin, newPin);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setShowChangePin(false);
      toast.success(t('security.change_pin_success'));
    } catch (error) {
      toast.error(error instanceof Error && error.message === translations.en.security.current_pin_invalid
        ? t('security.current_pin_invalid')
        : t('security.change_pin_failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="bg-surface rounded-[16px] divide-y divide-border overflow-hidden border border-border" style={{ boxShadow: '0 1px 4px var(--shadow-color)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-emerald-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-text">{t('security.title')}</p>
            <p className="text-[11px] leading-4 text-muted">{nativeSecurity ? t('security.native_status') : t('security.web_status')}</p>
          </div>
        </div>

        {nativeSecurity && <div className="px-4 py-3"><BiometricUnlockSettings /></div>}

        <button type="button" onClick={() => setShowChangePin(true)} disabled={!nativeSecurity} className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-50">
          <KeyRound size={20} className="text-indigo-500" />
          <div>
            <p className="text-[14px] font-semibold text-text">{t('security.change_pin')}</p>
            <p className="text-[11px] text-muted">{t('security.change_pin_desc')}</p>
          </div>
        </button>

        <button type="button" onClick={() => setShowReset(true)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-rose-600">
          <Trash2 size={20} />
          <span className="text-[14px] font-semibold">{t('security.delete_local_data')}</span>
        </button>
      </div>

      {showChangePin && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[var(--overlay)] p-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text">{t('security.change_pin')}</h2>
              <button type="button" onClick={() => setShowChangePin(false)} aria-label={t('common.close')}><X size={22} /></button>
            </div>
            {[
              [t('security.current_pin'), currentPin, setCurrentPin],
              [t('security.new_pin'), newPin, setNewPin],
              [t('security.confirm_pin'), confirmPin, setConfirmPin],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="mt-4 block text-sm font-semibold text-text">
                {label as string}
                <input
                  type="password"
                  inputMode="numeric"
                  value={value as string}
                  onChange={(event) => (setter as (value: string) => void)(event.target.value.replace(/\D/g, ''))}
                  className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2 text-text"
                />
              </label>
            ))}
            <button type="button" onClick={() => void changePin()} disabled={saving} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50">
              {saving ? t('common.saving') : t('security.change_pin')}
            </button>
          </div>
        </div>
      )}

      {showReset && (
        <RecoveryResetDialog
          onCancel={() => setShowReset(false)}
          onReset={() => window.location.reload()}
        />
      )}
    </>
  );
}
