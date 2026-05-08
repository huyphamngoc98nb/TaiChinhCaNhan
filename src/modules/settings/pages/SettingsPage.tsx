import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { DatabaseDiagnostics } from '../components/DatabaseDiagnostics';
import { LanguageSettings } from '../components/LanguageSettings';
import { CurrencySettings } from '../components/CurrencySettings';
import { useLanguage } from '@/shared/context/LanguageContext';
import { Database, ChevronRight } from 'lucide-react';

export function SettingsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div>
      <div className="header">{t('settings.title')}</div>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <LanguageSettings />

        <CurrencySettings />

        <div
          className="card"
          onClick={() => navigate(ROUTES.BACKUP)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(14, 165, 233, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Database size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '1rem' }}>{t('settings.backup_restore')}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t('settings.backup_restore_desc')}
            </div>
          </div>
          <ChevronRight size={20} color="var(--border)" />
        </div>

        <div style={{ marginTop: '16px' }}>
          <DatabaseDiagnostics />
        </div>
      </div>
    </div>
  );
}
