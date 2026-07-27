import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { DropdownList } from '@/shared/components/DropdownList';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import {
  APP_LOCK_TIMEOUT_OPTIONS,
  DEFAULT_APP_LOCK_TIMEOUT_SETTING,
  getAppLockTimeoutSetting,
  updateAppLockTimeoutSetting,
  type AppLockTimeoutSetting,
} from '../services/app-lock-timeout-settings.service';

export function AppLockTimeoutSettings() {
  const { t } = useLanguage();
  const toast = useToast();
  const [value, setValue] = useState<AppLockTimeoutSetting>(DEFAULT_APP_LOCK_TIMEOUT_SETTING);
  const [loading, setLoading] = useState(true);

  const options = useMemo(() => APP_LOCK_TIMEOUT_OPTIONS.map((option) => ({
    value: option,
    label: t(`security.app_lock_timeout_${option}`),
  })), [t]);

  useEffect(() => {
    let mounted = true;
    void getAppLockTimeoutSetting()
      .then((setting) => {
        if (mounted) setValue(setting);
      })
      .catch(() => {
        if (mounted) toast.error(t('security.app_lock_timeout_load_failed'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [t, toast]);

  async function changeTimeout(nextValue: AppLockTimeoutSetting) {
    const previous = value;
    setValue(nextValue);
    try {
      await updateAppLockTimeoutSetting(nextValue);
      toast.success(t('security.app_lock_timeout_updated'));
    } catch {
      setValue(previous);
      toast.error(t('security.app_lock_timeout_update_failed'));
    }
  }

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Clock3 size={18} className="text-indigo-500" />
        <p className="text-[14px] font-semibold text-text">{t('security.app_lock_timeout')}</p>
      </div>
      <DropdownList<AppLockTimeoutSetting>
        value={value}
        onChange={(nextValue) => void changeTimeout(nextValue)}
        ariaLabel={t('security.app_lock_timeout')}
        options={options}
        disabled={loading}
      />
      <p className="mt-2 text-[11px] leading-4 text-muted">
        {t('security.app_lock_timeout_desc')}
      </p>
    </div>
  );
}
