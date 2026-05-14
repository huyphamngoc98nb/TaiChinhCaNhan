import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { translations, type Language, type TranslationPath } from '../constants/translations';

const LANGUAGE_STORAGE_KEY = 'app_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: TranslationPath) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLang] = useState<Language>('vi');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    Preferences.get({ key: LANGUAGE_STORAGE_KEY })
      .then(({ value }) => {
        if (!mounted) {
          return;
        }

        if (value === 'en' || value === 'vi') {
          setLang(value);
        }
      })
      .finally(() => {
        if (mounted) {
          setReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    void Preferences.set({ key: LANGUAGE_STORAGE_KEY, value: lang });
  }, []);

  const t = useCallback((path: TranslationPath) => {
    const keys = path.split('.');
    let current: unknown = translations[language];

    for (const key of keys) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        let fallback: unknown = translations.en;

        for (const fallbackKey of keys) {
          if (!fallback || typeof fallback !== 'object' || !(fallbackKey in fallback)) {
            return path;
          }
          fallback = (fallback as Record<string, unknown>)[fallbackKey];
        }

        return typeof fallback === 'string' ? fallback : path;
      }

      current = (current as Record<string, unknown>)[key];
    }

    return typeof current === 'string' ? current : path;
  }, [language]);

  if (!ready) {
    return null;
  }

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
