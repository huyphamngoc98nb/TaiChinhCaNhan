import { CURRENCIES, type CurrencyCode } from '@/shared/context/CurrencyContext';
import type { DisplayFormatSettings } from '@/modules/settings/services/display-format-settings.service';

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

function toDate(timestamp: number): Date | null {
  if (!Number.isFinite(timestamp)) return null;

  const date = new Date(timestamp);
  return isValidDate(date) ? date : null;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function getCurrencyFractionDigits(currency: CurrencyCode): number {
  return CURRENCIES.find((item) => item.code === currency)?.fractionDigits ?? 0;
}

function getAmountDigits(currency: CurrencyCode, settings: DisplayFormatSettings) {
  if (settings.amountPrecision === 'integer') {
    return {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    };
  }

  const fractionDigits = getCurrencyFractionDigits(currency);

  return {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  };
}

function formatNumberOnly(
  value: number,
  currency: CurrencyCode,
  settings: DisplayFormatSettings,
  locale: string
): string {
  return new Intl.NumberFormat(locale, {
    ...getAmountDigits(currency, settings),
    useGrouping: settings.useGrouping,
  }).format(value);
}

function getCurrencyToken(
  currency: CurrencyCode,
  display: Exclude<DisplayFormatSettings['currencyDisplay'], 'none'>,
  locale: string
): string {
  if (display === 'code') return currency;

  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: display,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).formatToParts(0);

  return parts.find((part) => part.type === 'currency')?.value ?? currency;
}

export function formatAppDate(
  timestamp: number,
  settings: DisplayFormatSettings
): string {
  const date = toDate(timestamp);
  if (!date) return '';

  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = String(date.getFullYear());

  switch (settings.dateFormat) {
    case 'MM/dd/yyyy':
      return `${month}/${day}/${year}`;
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'dd/MM/yyyy':
    default:
      return `${day}/${month}/${year}`;
  }
}

export function formatAppTime(
  timestamp: number,
  settings: DisplayFormatSettings,
  locale?: string
): string {
  void locale;

  const date = toDate(timestamp);
  if (!date) return '';

  const hours = date.getHours();
  const minutes = pad2(date.getMinutes());

  if (settings.timeFormat === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  }

  return `${pad2(hours)}:${minutes}`;
}

export function formatAppDateTime(
  timestamp: number,
  settings: DisplayFormatSettings,
  locale?: string
): string {
  const date = formatAppDate(timestamp, settings);
  const time = formatAppTime(timestamp, settings, locale);

  return date && time ? `${date} ${time}` : '';
}

export function formatAppMonth(
  timestamp: number,
  settings: DisplayFormatSettings,
  locale = 'en-US'
): string {
  const date = toDate(timestamp);
  if (!date) return '';

  const month = pad2(date.getMonth() + 1);
  const year = String(date.getFullYear());

  if (settings.monthFormat === 'MMM yyyy') {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  return `${month}/${year}`;
}

export function formatAppAmount(
  value: number,
  currency: CurrencyCode,
  settings: DisplayFormatSettings,
  locale = 'vi-VN'
): string {
  if (!Number.isFinite(value)) return '';

  if (settings.currencyDisplay === 'none') {
    return formatNumberOnly(value, currency, settings, locale);
  }

  if (settings.currencyPosition === 'auto') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: settings.currencyDisplay,
      ...getAmountDigits(currency, settings),
      useGrouping: settings.useGrouping,
    }).format(value);
  }

  const number = formatNumberOnly(value, currency, settings, locale);
  const currencyToken = getCurrencyToken(currency, settings.currencyDisplay, locale);

  return settings.currencyPosition === 'before'
    ? `${currencyToken} ${number}`
    : `${number} ${currencyToken}`;
}

export function getStartOfWeek(
  date: Date,
  settings: DisplayFormatSettings
): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const day = start.getDay();
  const offset = settings.weekStart === 'monday'
    ? (day === 0 ? -6 : 1 - day)
    : -day;

  start.setDate(start.getDate() + offset);

  return start;
}

export function getEndOfWeek(
  date: Date,
  settings: DisplayFormatSettings
): Date {
  const end = getStartOfWeek(date, settings);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return end;
}
