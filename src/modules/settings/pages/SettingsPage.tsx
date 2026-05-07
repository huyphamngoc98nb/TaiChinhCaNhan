import { DatabaseDiagnostics } from '../components/DatabaseDiagnostics';
import { LanguageSettings } from '../components/LanguageSettings';
import { useLanguage } from '@/shared/context/LanguageContext';

export function SettingsPage() {
  const { t } = useLanguage();

  return (
    <div>
      <div className="header">{t('settings.title')}</div>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <LanguageSettings />
        
        <div style={{ marginTop: '16px' }}>
          <DatabaseDiagnostics />
        </div>
      </div>
    </div>
  );
}
