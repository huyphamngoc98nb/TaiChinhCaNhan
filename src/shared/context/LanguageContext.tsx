import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Language } from '../constants/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    localStorage.setItem('app_language', lang);
  }, []);

  const t = useCallback((path: string) => {
    const keys = path.split('.');
    let current: any = translations[language];
    
    for (const key of keys) {
      if (current[key] === undefined) {
        // Fallback to English if key missing in current language
        let fallback: any = translations['en'];
        for (const fkey of keys) {
          if (fallback[fkey] === undefined) return path;
          fallback = fallback[fkey];
        }
        return fallback;
      }
      current = current[key];
    }
    
    return current;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
