import React from 'react';
import { DollarSign } from 'lucide-react';
import { useCurrency, CURRENCIES, CurrencyCode } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';

export const CurrencySettings: React.FC = () => {
  const { currency, setCurrency } = useCurrency();
  const { t, language } = useLanguage();

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <DollarSign size={20} className="text-primary" />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{t('settings.currency')}</h3>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        {t('settings.select_currency')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {CURRENCIES.map((c) => {
          const isActive = currency === c.code;
          const label = language === 'vi' ? c.name_vi : c.name_en;
          return (
            <button
              key={c.code}
              onClick={() => setCurrency(c.code as CurrencyCode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                background: isActive ? 'rgba(14, 165, 233, 0.1)' : 'var(--bg)',
                color: isActive ? 'var(--primary)' : 'var(--text)',
                fontWeight: isActive ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                fontSize: '0.9rem',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{c.flag}</span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{c.code}</span>
                <span style={{ fontSize: '0.75rem', color: isActive ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '400' }}>
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
