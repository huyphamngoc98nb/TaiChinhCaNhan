import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, AlertCircle, ShieldCheck, Clock } from 'lucide-react';
import { BackButton } from '@/shared/components/BackButton';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { forceAppUnlock, resumeAppLock, suspendAppLock } from '@/app/providers/app-lock-events';
import { ROUTES } from '@/shared/constants/routes';
import { exportBackupJson } from '../services/export-backup-json';
import {
  EncryptedBackupPasswordRequiredError,
  importPreparedBackup,
  PreparedBackupImport,
  prepareBackupImport,
} from '../services/import-backup-json';
import { BackupDecryptionError, encryptBackupPayload } from '../services/encrypted-backup';
import { saveBackupFile } from '../services/save-backup-file';
import { BackupPasswordDialog } from '../components/BackupPasswordDialog';
import {
  AutoBackupInterval,
  AutoBackupSettings,
  getAutoBackupSettings,
  runAutoBackupIfDue,
  updateAutoBackupSettings,
} from '../services/auto-backup.service';

function formatLastRunAt(timestamp: number | null, locale: string, fallback: string) {
  if (!timestamp) return fallback;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

export function BackupPage() {
  const navigate = useNavigate();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { confirm } = useConfirm();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [autoSettings, setAutoSettings] = useState<AutoBackupSettings | null>(null);
  const [autoLoading, setAutoLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [encryptExport, setEncryptExport] = useState(true);
  const [exportPassword, setExportPassword] = useState('');
  const [confirmExportPassword, setConfirmExportPassword] = useState('');
  const [pendingEncryptedImport, setPendingEncryptedImport] = useState<File | null>(null);
  const [pendingImport, setPendingImport] = useState<PreparedBackupImport | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const restoreInProgressRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function loadAutoBackupSettings() {
      setAutoLoading(true);
      try {
        const settings = await getAutoBackupSettings();
        if (!mounted) return;
        setAutoSettings(settings);

        const result = await runAutoBackupIfDue();
        if (!mounted) return;

        if (result.settings) {
          setAutoSettings(result.settings);
        }

        if (result.saved) {
          showSuccessToast(t('backup.auto_backup_ran'));
        }
      } catch (error: any) {
        if (mounted) {
          showErrorToast(error?.message || t('backup.auto_settings_load_failed'));
        }
      } finally {
        if (mounted) {
          setAutoLoading(false);
        }
      }
    }

    void loadAutoBackupSettings();

    return () => {
      mounted = false;
      resumeAppLock();
    };
  }, [showErrorToast, showSuccessToast, t]);

  const handleToggleAutoBackup = async () => {
    if (!autoSettings || autoSaving) return;

    const nextEnabled = !autoSettings.enabled;
    setAutoSaving(true);
    try {
      const nextSettings = await updateAutoBackupSettings({ enabled: nextEnabled });
      setAutoSettings(nextSettings);
      showSuccessToast(
        nextEnabled ? t('backup.auto_backup_enabled') : t('backup.auto_backup_disabled')
      );
    } catch (error: any) {
      showErrorToast(error?.message || t('backup.auto_settings_save_failed'));
    } finally {
      setAutoSaving(false);
    }
  };

  const handleChangeAutoInterval = async (interval: AutoBackupInterval) => {
    if (!autoSettings || autoSaving || autoSettings.interval === interval) return;

    setAutoSaving(true);
    try {
      const nextSettings = await updateAutoBackupSettings({ interval });
      setAutoSettings(nextSettings);
      showSuccessToast(t('backup.auto_interval_updated'));
    } catch (error: any) {
      showErrorToast(error?.message || t('backup.auto_settings_save_failed'));
    } finally {
      setAutoSaving(false);
    }
  };

  const handleExport = async () => {
    if (encryptExport && exportPassword.length < 8) {
      showErrorToast(t('backup.password_too_short'));
      return;
    }
    if (encryptExport && exportPassword !== confirmExportPassword) {
      showErrorToast(t('backup.password_mismatch'));
      return;
    }

    const ok = await confirm({
      title: t('backup.export_title'),
      message: encryptExport
        ? 'File xuất có thể chứa dữ liệu tài chính cá nhân. Hãy lưu ở nơi an toàn.'
        : 'File xuất có thể chứa dữ liệu tài chính cá nhân. Hãy lưu ở nơi an toàn. File backup này không được mã hóa.',
      confirmText: t('backup.export_button'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;

    setLoading(true);
    try {
      const payload = await exportBackupJson();
      const fileName = `expense_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
      const backup = encryptExport
        ? await encryptBackupPayload(payload, exportPassword)
        : payload;
      const saved = await saveBackupFile(fileName, JSON.stringify(backup, null, 2));

      if (saved) {
        showSuccessToast(t('backup.export_success'));
        forceAppUnlock();
        navigate(ROUTES.HOME, { replace: true });
      }
    } catch (error: any) {
      showErrorToast(`${t('backup.export_failed')} ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBackupFile = async () => {
    if (loading) return;

    suspendAppLock();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      window.addEventListener(
        'focus',
        () => {
          window.setTimeout(() => {
            if (
              !restoreInProgressRef.current &&
              !pendingImport &&
              !pendingEncryptedImport &&
              !fileInputRef.current?.files?.length
            ) {
              resumeAppLock();
            }
          }, 1000);
        },
        { once: true },
      );
      fileInputRef.current.click();
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    let awaitingPassword = false;
    let preparedForPreview = false;
    if (!file) {
      resumeAppLock();
      return;
    }

    restoreInProgressRef.current = true;
    setLoading(true);
    try {
      const prepared = await prepareBackupImport(file);
      setPendingImport(prepared);
      preparedForPreview = true;
      event.target.value = '';
    } catch (error: any) {
      if (error instanceof EncryptedBackupPasswordRequiredError) {
        awaitingPassword = true;
        setPendingEncryptedImport(file);
        event.target.value = '';
        setLoading(false);
        return;
      }
      showErrorToast(`${t('backup.restore_failed')} ${error.message}`);
      event.target.value = ''; // Reset input
      resumeAppLock();
    } finally {
      setLoading(false);
      if (!awaitingPassword && !preparedForPreview && !fileInputRef.current?.files?.length) {
        restoreInProgressRef.current = false;
      }
    }
  };

  const handleEncryptedImport = async (password: string) => {
    if (!pendingEncryptedImport) return;

    setLoading(true);
    try {
      const prepared = await prepareBackupImport(pendingEncryptedImport, password);
      setPendingEncryptedImport(null);
      setPendingImport(prepared);
    } catch (error: any) {
      showErrorToast(
        error instanceof BackupDecryptionError
          ? t('backup.decrypt_failed')
          : `${t('backup.restore_failed')} ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEncryptedImport = () => {
    if (loading) return;
    setPendingEncryptedImport(null);
    restoreInProgressRef.current = false;
    resumeAppLock();
  };

  const handleConfirmImport = async () => {
    if (!pendingImport || loading) return;

    const ok = await confirm({
      title: t('backup.restore_confirm_title'),
      message: `${t('backup.restore_confirm_msg')}\n\n${t('backup.restore_replace_instruction')}`,
      confirmText: 'REPLACE',
      cancelText: t('common.cancel'),
    });
    if (!ok) return;

    setLoading(true);
    try {
      await importPreparedBackup(pendingImport);
      setPendingImport(null);
      restoreInProgressRef.current = false;
      showSuccessToast(t('backup.restore_success'));
      forceAppUnlock();
      navigate(ROUTES.HOME, { replace: true });
    } catch (error: any) {
      showErrorToast(`${t('backup.restore_failed')} ${error.message}`);
      resumeAppLock();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelImportPreview = () => {
    if (loading) return;
    setPendingImport(null);
    restoreInProgressRef.current = false;
    resumeAppLock();
  };

  const intervalOptions: Array<{ value: AutoBackupInterval; label: string }> = [
    { value: 'daily', label: t('backup.auto_interval_daily') },
    { value: 'weekly', label: t('backup.auto_interval_weekly') },
    { value: 'monthly', label: t('backup.auto_interval_monthly') },
  ];
  const selectedIntervalLabel =
    intervalOptions.find((option) => option.value === autoSettings?.interval)?.label ||
    t('backup.auto_interval_daily');
  const autoControlsDisabled = loading || autoLoading || autoSaving;
  const autoLocale = language === 'vi' ? 'vi-VN' : 'en-US';
  const autoStatusLabel = autoLoading
    ? t('common.loading')
    : autoSettings?.enabled
      ? t('backup.auto_status_on')
      : t('backup.auto_status_off');
  const autoStatusColor =
    !autoLoading && autoSettings?.enabled ? '#059669' : 'var(--text-muted)';
  const importPreviewSummary = pendingImport
    ? `File backup hợp lệ. Sẽ nhập ${pendingImport.preview.counts.wallets} ví, ${pendingImport.preview.counts.transactions} giao dịch, ${pendingImport.preview.counts.categories} danh mục, ${pendingImport.preview.counts.budgets} ngân sách và ${pendingImport.preview.counts.loans} khoản vay.`
    : '';
  const importExportedAt = pendingImport
    ? formatLastRunAt(
        pendingImport.preview.metadata.exported_at,
        language === 'vi' ? 'vi-VN' : 'en-US',
        '-'
      )
    : '';

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <BackButton onClick={() => navigate(ROUTES.HOME)} ariaLabel={t('common.back')} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{t('backup.title')}</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Export Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                padding: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                borderRadius: '12px',
              }}
            >
              <Download size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                {t('backup.export_title')}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {t('backup.export_desc')}
              </p>
            </div>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '14px',
              fontWeight: '600',
            }}
          >
            <span>{t('backup.encrypt_backup')}</span>
            <input
              type="checkbox"
              checked={encryptExport}
              onChange={(event) => setEncryptExport(event.target.checked)}
              disabled={loading}
            />
          </label>
          {encryptExport ? (
            <div style={{ display: 'grid', gap: '10px', marginBottom: '14px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem' }}>
                <span>{t('backup.backup_password')}</span>
                <input
                  type="password"
                  value={exportPassword}
                  onChange={(event) => setExportPassword(event.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  style={{
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                  }}
                />
              </label>
              <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem' }}>
                <span>{t('backup.confirm_password')}</span>
                <input
                  type="password"
                  value={confirmExportPassword}
                  onChange={(event) => setConfirmExportPassword(event.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  style={{
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                  }}
                />
              </label>
              <p style={{ margin: 0, color: '#b45309', fontSize: '0.8rem', lineHeight: 1.4 }}>
                {t('backup.password_loss_warning')}
              </p>
            </div>
          ) : (
            <p style={{ margin: '0 0 14px', color: '#be123c', fontSize: '0.8rem', lineHeight: 1.4 }}>
              {t('backup.plaintext_warning')}
            </p>
          )}
          <button
            onClick={handleExport}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? t('common.processing') : t('backup.export_button')}
          </button>
        </div>

        {/* Auto Backup Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                padding: '10px',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#2563eb',
                borderRadius: '12px',
              }}
            >
              <Clock size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                {t('backup.auto_title')}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {t('backup.auto_desc')}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#b45309' }}>
                {t('backup.auto_plaintext_warning')}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(autoSettings?.enabled)}
              aria-label={t('backup.auto_toggle')}
              onClick={() => void handleToggleAutoBackup()}
              disabled={autoControlsDisabled || !autoSettings}
              style={{
                width: '52px',
                height: '30px',
                borderRadius: '999px',
                border: 'none',
                background: autoSettings?.enabled ? 'var(--primary)' : '#d1d5db',
                padding: '3px',
                cursor: autoControlsDisabled || !autoSettings ? 'not-allowed' : 'pointer',
                opacity: autoControlsDisabled && !autoLoading ? 0.75 : 1,
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
                  transform: autoSettings?.enabled ? 'translateX(22px)' : 'translateX(0)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
            {intervalOptions.map((option) => {
              const selected = autoSettings?.interval === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => void handleChangeAutoInterval(option.value)}
                  disabled={autoControlsDisabled || !autoSettings}
                  style={{
                    minHeight: '42px',
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: selected ? 'var(--primary)' : 'var(--border)',
                    background: selected ? 'rgba(14, 165, 233, 0.1)' : 'var(--bg)',
                    color: selected ? 'var(--primary)' : 'var(--text)',
                    fontWeight: selected ? '700' : '600',
                    fontSize: '0.85rem',
                    lineHeight: 1.2,
                    cursor: autoControlsDisabled || !autoSettings ? 'not-allowed' : 'pointer',
                    opacity: autoControlsDisabled && !autoLoading ? 0.75 : 1,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.03)',
              display: 'grid',
              gap: '8px',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('backup.auto_status')}</span>
              <strong style={{ color: autoStatusColor }}>{autoStatusLabel}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('backup.auto_current_interval')}</span>
              <strong>{autoLoading ? t('common.loading') : selectedIntervalLabel}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('backup.auto_last_run')}</span>
              <strong style={{ textAlign: 'right' }}>
                {autoLoading
                  ? t('common.loading')
                  : formatLastRunAt(
                      autoSettings?.lastRunAt ?? null,
                      autoLocale,
                      t('backup.auto_never_run')
                    )}
              </strong>
            </div>
          </div>
        </div>

        {/* Import Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                padding: '10px',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                borderRadius: '12px',
              }}
            >
              <Upload size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                {t('backup.restore_title')}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {t('backup.restore_desc')}
              </p>
            </div>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,text/json,.json,*/*"
              onChange={handleImport}
              disabled={loading}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => void handleSelectBackupFile()}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                color: '#f59e0b',
                border: '2px dashed #f59e0b',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? t('common.processing') : t('backup.restore_button')}
            </button>
          </div>

          {pendingImport && (
            <div
              style={{
                marginTop: '16px',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                background: 'rgba(245, 158, 11, 0.08)',
                display: 'grid',
                gap: '10px',
              }}
            >
              <strong style={{ fontSize: '0.95rem' }}>{importPreviewSummary}</strong>
              <div style={{ display: 'grid', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>Version backup: {pendingImport.preview.metadata.version}</span>
                <span>Thời điểm export: {importExportedAt}</span>
                <span>
                  Trạng thái bảo mật:{' '}
                  {pendingImport.preview.encrypted ? 'Đã mã hóa' : 'File backup này không được mã hóa.'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCancelImportPreview}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontWeight: '700',
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmImport()}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#f59e0b',
                    color: '#fff',
                    fontWeight: '700',
                  }}
                >
                  {loading ? t('common.processing') : t('backup.replace_confirm')}
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(244, 63, 94, 0.05)',
              borderRadius: '10px',
              display: 'flex',
              gap: '10px',
              border: '1px solid rgba(244, 63, 94, 0.1)',
            }}
          >
            <AlertCircle size={18} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#be123c', lineHeight: '1.4' }}>
              {t('backup.warning')}
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div style={{ padding: '0 8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-muted)',
              marginBottom: '12px',
            }}
          >
            <ShieldCheck size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
              {t('backup.local_security')}
            </span>
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              lineHeight: '1.6',
            }}
          >
            <li>{t('backup.security_1')}</li>
            <li>{t('backup.security_2')}</li>
            <li>{t('backup.security_3')}</li>
          </ul>
        </div>
      </div>
      {pendingEncryptedImport && (
        <BackupPasswordDialog
          title={t('backup.enter_password_title')}
          label={t('backup.backup_password')}
          warning={t('backup.password_loss_warning')}
          submitText={t('backup.restore_confirm_btn')}
          cancelText={t('common.cancel')}
          loading={loading}
          onSubmit={handleEncryptedImport}
          onCancel={handleCancelEncryptedImport}
        />
      )}
    </div>
  );
}
