import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { BackButton } from '@/shared/components/BackButton';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { clearErrorLogs, exportErrorLogs, logAppError } from '@/core/telemetry/error.service';
import { DatabaseDiagnostics } from '../components/DatabaseDiagnostics';
import { LanguageSettings } from '../components/LanguageSettings';
import { CurrencySettings } from '../components/CurrencySettings';
import { DisplayFormatSettings } from '../components/DisplayFormatSettings';
import { TransactionInputSettings } from '../components/TransactionInputSettings';
import { SecuritySettings } from '../components/SecuritySettings';
import { ThemeSelector } from '../components/ThemeSelector';
import { useLanguage } from '@/shared/context/LanguageContext';
import {
  ChevronRight,
  Bug,
  Trash2,
} from 'lucide-react';

export function SettingsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const [isExportingLogs, setIsExportingLogs] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  const handleExportErrorLogs = async () => {
    if (isExportingLogs) return;

    setIsExportingLogs(true);
    try {
      const result = await exportErrorLogs();
      toast.success(
        result.count === 0
          ? t('settings.export_logs_empty')
          : t('settings.export_logs_success')
      );
    } catch (error) {
      void logAppError(error, {
        screen: 'SettingsPage',
        action: 'exportErrorLogs',
        userMessage: t('settings.export_logs_failed'),
      });
      toast.error(t('settings.export_logs_failed'));
    } finally {
      setIsExportingLogs(false);
    }
  };

  const handleClearErrorLogs = async () => {
    if (isClearingLogs) return;

    setIsClearingLogs(true);
    try {
      await clearErrorLogs();
      toast.success(t('settings.clear_logs_success'));
    } catch (error) {
      void logAppError(error, {
        screen: 'SettingsPage',
        action: 'clearErrorLogs',
        userMessage: t('settings.clear_logs_failed'),
      });
      toast.error(t('settings.clear_logs_failed'));
    } finally {
      setIsClearingLogs(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <BackButton onClick={() => navigate(ROUTES.HOME)} ariaLabel={t('common.back')} />
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold text-text">{t('settings.title')}</h1>
          <p className="text-[12px] text-muted">{t('settings.app_customization')}</p>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-4">
        {/* Language + Currency */}
        <div className="bg-surface rounded-[16px] divide-y divide-border overflow-hidden border border-border"
          style={{ boxShadow: '0 1px 4px var(--shadow-color)' }}>
          <div className="px-4 py-3"><ThemeSelector /></div>
          <div className="px-4 py-3"><LanguageSettings /></div>
          <div className="px-4 py-3"><CurrencySettings /></div>
          <div className="px-4 py-3"><DisplayFormatSettings /></div>
          <div className="px-4 py-3"><TransactionInputSettings /></div>
        </div>

        <SecuritySettings />

        {/* Debug tools */}
        <div className="bg-surface rounded-[16px] divide-y divide-border overflow-hidden border border-border"
          style={{ boxShadow: '0 1px 4px var(--shadow-color)' }}>
          <button
            type="button"
            onClick={handleExportErrorLogs}
            disabled={isExportingLogs}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-bg-subtle transition-colors disabled:opacity-60"
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
            >
              <Bug size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-text">
                {isExportingLogs ? t('settings.exporting_logs') : t('settings.export_logs')}
              </p>
              <p className="text-[11px] text-muted truncate">
                {t('settings.export_logs_desc')}
              </p>
            </div>
            <ChevronRight size={18} className="text-gray-300 shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleClearErrorLogs}
            disabled={isClearingLogs}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-bg-subtle transition-colors disabled:opacity-60"
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}
            >
              <Trash2 size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-text">
                {isClearingLogs ? t('settings.clearing_logs') : t('settings.clear_logs')}
              </p>
              <p className="text-[11px] text-muted truncate">
                {t('settings.clear_logs_desc')}
              </p>
            </div>
          </button>
        </div>

        {/* DB Diagnostics */}
        <div className="bg-surface rounded-[16px] overflow-hidden border border-border"
          style={{ boxShadow: '0 1px 4px var(--shadow-color)' }}>
          <div className="px-4 py-3">
            <DatabaseDiagnostics />
          </div>
        </div>
      </div>
    </div>
  );
}
