import { translations } from '../src/shared/constants/translations';

function getKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? getKeys(value, path) : [path];
  });
}

const enKeys = new Set(getKeys(translations.en));
const viKeys = new Set(getKeys(translations.vi));

const missingInVi = [...enKeys].filter(key => !viKeys.has(key));
const missingInEn = [...viKeys].filter(key => !enKeys.has(key));

if (missingInVi.length) {
  console.error('Missing in VI:', missingInVi);
}

if (missingInEn.length) {
  console.error('Missing in EN:', missingInEn);
}

if (!missingInVi.length && !missingInEn.length) {
  console.log('All translation keys are synchronized.');
}

if (missingInVi.length || missingInEn.length) {
  process.exitCode = 1;
}
