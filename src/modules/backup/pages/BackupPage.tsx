import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Upload, AlertCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { exportBackupJson } from '../services/export-backup-json';
import { importBackupJson } from '../services/import-backup-json';

export function BackupPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const payload = await exportBackupJson();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `expense_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(t('backup.export_success'));
    } catch (error: any) {
      toast.error(`${t('backup.export_failed')} ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ok = await confirm({
      title: t('backup.restore_confirm_title'),
      message: t('backup.restore_confirm_msg'),
      confirmText: t('backup.restore_confirm_btn'),
      cancelText: t('common.cancel')
    });

    if (!ok) {
      event.target.value = ''; // Reset input
      return;
    }

    setLoading(true);
    try {
      await importBackupJson(file);
      toast.success(t('backup.restore_success'));
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      toast.error(`${t('backup.restore_failed')} ${error.message}`);
      event.target.value = ''; // Reset input
    } finally {
      setLoading(false);
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
          
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={loading}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                width: '100%'
              }}
            />
            <button
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                color: '#f59e0b',
                border: '2px dashed #f59e0b',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '1rem',
                pointerEvents: 'none'
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
