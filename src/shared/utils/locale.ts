import type { Language } from '@/shared/constants/translations';

export function getAppLocale(language: Language): string {
  return language === 'vi' ? 'vi-VN' : 'en-US';
}
