import React, { createContext, useContext, useState, useCallback } from 'react';

export type CurrencyCode = 'VND' | 'USD' | 'EUR' | 'JPY' | 'GBP' | 'SGD' | 'THB' | 'KRW';

export interface CurrencyInfo {
  code: CurrencyCode;
  flag: string;
  name_en: string;
  name_vi: string;
  fractionDigits: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'VND', flag: '🆻🇳', name_en: 'Vietnamese Dong',  name_vi: 'Việt Nam Đồng', fractionDigits: 0 },
  { code: 'USD', flag: '🇺🇸', name_en: 'US Dollar',         name_vi: 'Đô la Mỹ',         fractionDigits: 2 },
  { code: 'EUR', flag: '🇪🇺', name_en: 'Euro',              name_vi: 'Euro',              fractionDigits: 2 },
  { code: 'JPY', flag: '🇯🇵', name_en: 'Japanese Yen',     name_vi: 'Yên Nhật',          fractionDigits: 0 },
  { code: 'GBP', flag: '🇬🇧', name_en: 'British Pound',   name_vi: 'Bảng Anh',          fractionDigits: 2 },
  { code: 'SGD', flag: '🇸🇬', name_en: 'Singapore Dollar',name_vi: 'Đô la Singapore',  fractionDigits: 2 },
  { code: 'THB', flag: '🇹🇭', name_en: 'Thai Baht',       name_vi: 'Baht Thái',          fractionDigits: 2 },
  { code: 'KRW', flag: '🇰🇷', name_en: 'South Korean Won',name_vi: 'Won Hàn Quốc',     fractionDigits: 0 },
];

interface CurrencyContextType {
  currency: CurrencyCode;
  currencyInfo: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => void;
  formatAmount: (value: number, locale?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('app_currency');
    return (saved as CurrencyCode) || 'VND';
  });

  const currencyInfo = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem('app_currency', code);
  }, []);

  const formatAmount = useCallback((value: number, locale = 'vi-VN') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currencyInfo.fractionDigits,
      minimumFractionDigits: currencyInfo.fractionDigits,
    }).format(value);
  }, [currency, currencyInfo]);

  return (
    <CurrencyContext.Provider value={{ currency, currencyInfo, setCurrency, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
};
