import { describe, expect, it } from 'vitest';
import { translations } from '@/shared/constants/translations';

function getKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? getKeys(value, path) : [path];
  });
}

describe('translations', () => {
  it('keeps EN and VI keys synchronized', () => {
    const enKeys = new Set(getKeys(translations.en));
    const viKeys = new Set(getKeys(translations.vi));

    const missingInVi = [...enKeys].filter(key => !viKeys.has(key));
    const missingInEn = [...viKeys].filter(key => !enKeys.has(key));

    expect(missingInVi).toEqual([]);
    expect(missingInEn).toEqual([]);
  });
});
