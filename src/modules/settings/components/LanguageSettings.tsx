import React from 'react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { Languages } from 'lucide-react';

export const LanguageSettings: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Languages size={20} className="text-primary" />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{t('settings.language')}</h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {t('settings.select_language')}
        </p>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setLanguage('en')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid',
              borderColor: language === 'en' ? 'var(--primary)' : 'var(--border)',
              background: language === 'en' ? 'rgba(14, 165, 233, 0.1)' : 'var(--bg)',
              color: language === 'en' ? 'var(--primary)' : 'var(--text)',
              fontWeight: language === 'en' ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🇺🇸 {t('settings.english')}
          </button>
          
          <button
            onClick={() => setLanguage('vi')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid',
              borderColor: language === 'vi' ? 'var(--primary)' : 'var(--border)',
              background: language === 'vi' ? 'rgba(14, 165, 233, 0.1)' : 'var(--bg)',
              color: language === 'vi' ? 'var(--primary)' : 'var(--text)',
              fontWeight: language === 'vi' ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🇻🇳 {t('settings.vietnamese')}
          </button>
        </div>
      </div>
    </div>
  );
};
