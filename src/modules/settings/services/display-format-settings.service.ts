export type DateFormat = 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
export type TimeFormat = '24h' | '12h';
export type MonthFormat = 'MM/yyyy' | 'MMM yyyy';
export type WeekStart = 'monday' | 'sunday';
export type CurrencyDisplayMode = 'symbol' | 'code' | 'none';
export type CurrencyPosition = 'auto' | 'before' | 'after';
export type AmountPrecision = 'currency_default' | 'integer';

export interface DisplayFormatSettings {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  monthFormat: MonthFormat;
  weekStart: WeekStart;
  currencyDisplay: CurrencyDisplayMode;
  currencyPosition: CurrencyPosition;
  useGrouping: boolean;
  amountPrecision: AmountPrecision;
}

export const DEFAULT_DISPLAY_FORMAT_SETTINGS: DisplayFormatSettings = {
  dateFormat: 'dd/MM/yyyy',
  timeFormat: '24h',
  monthFormat: 'MM/yyyy',
  weekStart: 'monday',
  currencyDisplay: 'symbol',
  currencyPosition: 'auto',
  useGrouping: true,
  amountPrecision: 'currency_default',
};

export const STORAGE_PREFIX = 'settings.display_format.';
export const DISPLAY_FORMAT_SETTINGS_CHANGE_EVENT = 'display-format-settings-change';

const DATE_FORMATS: DateFormat[] = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];
const TIME_FORMATS: TimeFormat[] = ['24h', '12h'];
const MONTH_FORMATS: MonthFormat[] = ['MM/yyyy', 'MMM yyyy'];
const WEEK_STARTS: WeekStart[] = ['monday', 'sunday'];
const CURRENCY_DISPLAY_MODES: CurrencyDisplayMode[] = ['symbol', 'code', 'none'];
const CURRENCY_POSITIONS: CurrencyPosition[] = ['auto', 'before', 'after'];
const AMOUNT_PRECISIONS: AmountPrecision[] = ['currency_default', 'integer'];

function isOneOf<T extends string>(value: unknown, allowedValues: readonly T[]): value is T {
  return typeof value === 'string' && allowedValues.includes(value as T);
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;

  return fallback;
}

function getStoredValue(key: keyof DisplayFormatSettings): string | null {
  return localStorage.getItem(`${STORAGE_PREFIX}${key}`);
}

function normalizeDisplayFormatSettings(
  value: Partial<Record<keyof DisplayFormatSettings, unknown>>
): DisplayFormatSettings {
  return {
    dateFormat: isOneOf(value.dateFormat, DATE_FORMATS)
      ? value.dateFormat
      : DEFAULT_DISPLAY_FORMAT_SETTINGS.dateFormat,
    timeFormat: isOneOf(value.timeFormat, TIME_FORMATS)
      ? value.timeFormat
      : DEFAULT_DISPLAY_FORMAT_SETTINGS.timeFormat,
    monthFormat: isOneOf(value.monthFormat, MONTH_FORMATS)
      ? value.monthFormat
      : DEFAULT_DISPLAY_FORMAT_SETTINGS.monthFormat,
    weekStart: isOneOf(value.weekStart, WEEK_STARTS)
      ? value.weekStart
      : DEFAULT_DISPLAY_FORMAT_SETTINGS.weekStart,
    currencyDisplay: isOneOf(value.currencyDisplay, CURRENCY_DISPLAY_MODES)
      ? value.currencyDisplay
      : DEFAULT_DISPLAY_FORMAT_SETTINGS.currencyDisplay,
    currencyPosition: isOneOf(value.currencyPosition, CURRENCY_POSITIONS)
      ? value.currencyPosition
      : DEFAULT_DISPLAY_FORMAT_SETTINGS.currencyPosition,
    useGrouping: normalizeBoolean(
      value.useGrouping,
      DEFAULT_DISPLAY_FORMAT_SETTINGS.useGrouping
    ),
    amountPrecision: isOneOf(value.amountPrecision, AMOUNT_PRECISIONS)
      ? value.amountPrecision
      : DEFAULT_DISPLAY_FORMAT_SETTINGS.amountPrecision,
  };
}

function readStoredSettings(): DisplayFormatSettings {
  return normalizeDisplayFormatSettings({
    dateFormat: getStoredValue('dateFormat'),
    timeFormat: getStoredValue('timeFormat'),
    monthFormat: getStoredValue('monthFormat'),
    weekStart: getStoredValue('weekStart'),
    currencyDisplay: getStoredValue('currencyDisplay'),
    currencyPosition: getStoredValue('currencyPosition'),
    useGrouping: getStoredValue('useGrouping'),
    amountPrecision: getStoredValue('amountPrecision'),
  });
}

function writeStoredSettings(settings: DisplayFormatSettings): void {
  Object.entries(settings).forEach(([key, value]) => {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(value));
  });
}

function notifyDisplayFormatSettingsChange(): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event(DISPLAY_FORMAT_SETTINGS_CHANGE_EVENT));
}

export function getDisplayFormatSettings(): DisplayFormatSettings {
  return readStoredSettings();
}

export function saveDisplayFormatSettings(settings: DisplayFormatSettings): void {
  writeStoredSettings(normalizeDisplayFormatSettings(settings));
  notifyDisplayFormatSettingsChange();
}

export function updateDisplayFormatSettings(
  patch: Partial<DisplayFormatSettings>
): DisplayFormatSettings {
  const nextSettings = normalizeDisplayFormatSettings({
    ...getDisplayFormatSettings(),
    ...patch,
  });

  writeStoredSettings(nextSettings);
  notifyDisplayFormatSettingsChange();

  return nextSettings;
}

export function resetDisplayFormatSettings(): DisplayFormatSettings {
  Object.keys(DEFAULT_DISPLAY_FORMAT_SETTINGS).forEach((key) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  });

  notifyDisplayFormatSettingsChange();

  return { ...DEFAULT_DISPLAY_FORMAT_SETTINGS };
}
