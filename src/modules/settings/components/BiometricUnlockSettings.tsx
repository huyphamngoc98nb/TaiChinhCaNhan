import { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { authService } from '@/core/auth/auth.service';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { requireStepUpAuthentication } from '@/core/auth/step-up-authentication';

export function BiometricUnlockSettings() {
  const toast = useToast();
  const { t } = useLanguage();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [nextAvailable, nextEnabled] = await Promise.all([
          authService.isBiometricUnlockAvailable(),
          authService.isBiometricUnlockEnabled(),
        ]);
        if (!mounted) return;
        setAvailable(nextAvailable);
        setEnabled(nextEnabled);
      } catch {
        if (!mounted) return;
        setAvailable(false);
        setEnabled(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function toggle() {
    if (!available || saving) return;

    const nextEnabled = !enabled;
    setSaving(true);
    try {
      if (!nextEnabled) {
        const authentication = await requireStepUpAuthentication('CHANGE_BIOMETRIC_SETTINGS');
        if (authentication !== 'SUCCESS') {
          if (authentication !== 'CANCELLED') toast.error(t('app_lock.unlock_error'));
          return;
        }
      }
      await authService.setBiometricUnlockEnabled(nextEnabled);
      setEnabled(nextEnabled);
      toast.success(nextEnabled ? t('settings.biometric_enabled') : t('settings.biometric_disabled'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.biometric_update_failed'));
    } finally {
      setSaving(false);
    }
  }

  const disabled = loading || saving || !available;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className="w-full flex items-center gap-3 text-left disabled:opacity-60"
    >
      <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-500">
        <Fingerprint size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-text">{t('settings.biometric_unlock')}</p>
        <p className="text-[11px] text-muted truncate">
          {available
            ? t('settings.biometric_available_desc')
            : t('settings.biometric_unavailable_desc')}
        </p>
      </div>

      <span
        className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
          enabled ? 'bg-indigo-500' : 'bg-surface-muted'
        }`}
        aria-hidden="true"
      >
        <span
          className={`w-4 h-4 rounded-full shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-0'
          }`}
          style={{ background: '#ffffff' }}
        />
      </span>
    </button>
  );
}
