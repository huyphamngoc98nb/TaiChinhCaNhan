import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, AlertCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { resumeAppLock, suspendAppLock } from '@/app/providers/app-lock-events';
import { ROUTES } from '@/shared/constants/routes';
import { exportBackupJson } from '../services/export-backup-json';
import { importBackupJson } from '../services/import-backup-json';
import { saveBackupFile } from '../services/save-backup-file';

export function BackupPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const restoreInProgressRef = useRef(false);

  useEffect(() => {
    return () => {
      resumeAppLock();
    };
  }, []);

  const handleExport = async () => {
    setLoading(true);
    try {
      const payload = await exportBackupJson();
      const fileName = `expense_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
      const saved = await saveBackupFile(fileName, JSON.stringify(payload, null, 2));

      if (saved) {
        toast.success(t('backup.export_success'));
        navigate(ROUTES.HOME, { replace: true });
      }
    } catch (error: any) {
      toast.error(`${t('backup.export_failed')} ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBackupFile = async () => {
    if (loading) return;

    const ok = await confirm({
      title: t('backup.restore_confirm_title'),
      message: t('backup.restore_confirm_msg'),
      confirmText: t('backup.restore_confirm_btn'),
      cancelText: t('common.cancel')
    });

    if (ok) {
      suspendAppLock();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        window.addEventListener('focus', () => {
          window.setTimeout(() => {
            if (!restoreInProgressRef.current && !fileInputRef.current?.files?.length) {
              resumeAppLock();
            }
          }, 1000);
        }, { once: true });
        fileInputRef.current.click();
      }
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      resumeAppLock();
      return;
    }

    restoreInProgressRef.current = true;
    setLoading(true);
    try {
      await importBackupJson(file);
      toast.success(t('backup.restore_success'));
      event.target.value = '';
      restoreInProgressRef.current = false;
      resumeAppLock();
      navigate(ROUTES.HOME, { replace: true });
    } catch (error: any) {
      toast.error(`${t('backup.restore_failed')} ${error.message}`);
      event.target.value = ''; // Reset input
      resumeAppLock();
    } finally {
      setLoading(false);
      if (!fileInputRef.current?.files?.length) {
        restoreInProgressRef.current = false;
      }
    }
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px' }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{t('backup.title')}</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Export Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px' }}>
              <Download size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{t('backup.export_title')}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('backup.export_desc')}</p>
            </div>
          </div>
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
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? t('common.processing') : t('backup.export_button')}
          </button>
        </div>

        {/* Import Card */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '12px' }}>
              <Upload size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{t('backup.restore_title')}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('backup.restore_desc')}</p>
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
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? t('common.processing') : t('backup.restore_button')}
            </button>
          </div>

          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'rgba(244, 63, 94, 0.05)', 
            borderRadius: '10px',
            display: 'flex',
            gap: '10px',
            border: '1px solid rgba(244, 63, 94, 0.1)'
          }}>
            <AlertCircle size={18} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#be123c', lineHeight: '1.4' }}>
              {t('backup.warning')}
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div style={{ padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            <ShieldCheck size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{t('backup.local_security')}</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            <li>{t('backup.security_1')}</li>
            <li>{t('backup.security_2')}</li>
            <li>{t('backup.security_3')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
