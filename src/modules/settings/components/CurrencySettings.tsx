import React from 'react';
import { DollarSign } from 'lucide-react';
import { useCurrency, CURRENCIES, CurrencyCode } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { DropdownList } from '@/shared/components/DropdownList';

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

      <DropdownList
        value={currency}
        onChange={(value) => setCurrency(value)}
        ariaLabel={t('settings.currency')}
        buttonClassName="bg-white"
        options={CURRENCIES.map((c) => {
          const label = language === 'vi' ? c.name_vi : c.name_en;
          return {
            value: c.code as CurrencyCode,
            label: `${c.flag} ${c.code} - ${label}`,
          };
        })}
      />
    </div>
  );
};
