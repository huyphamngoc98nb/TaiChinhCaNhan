import { describe, expect, it } from 'vitest';
import type { DisplayFormatSettings } from '@/modules/settings/services/display-format-settings.service';
import { DEFAULT_DISPLAY_FORMAT_SETTINGS } from '@/modules/settings/services/display-format-settings.service';
import {
  formatAppAmount,
  formatAppDate,
  formatAppDateTime,
  formatAppMonth,
  formatAppTime,
  getEndOfWeek,
  getStartOfWeek,
} from './display-format';

const timestamp = new Date(2026, 5, 22, 14, 30, 0).getTime();

function withSettings(patch: Partial<DisplayFormatSettings>): DisplayFormatSettings {
  return {
    ...DEFAULT_DISPLAY_FORMAT_SETTINGS,
    ...patch,
  };
}

describe('display format utilities', () => {
  it('formats app date with dd/MM/yyyy', () => {
    expect(formatAppDate(timestamp, withSettings({ dateFormat: 'dd/MM/yyyy' }))).toBe(
      '22/06/2026'
    );
  });

  it('formats app date with MM/dd/yyyy', () => {
    expect(formatAppDate(timestamp, withSettings({ dateFormat: 'MM/dd/yyyy' }))).toBe(
      '06/22/2026'
    );
  });

  it('formats app date with yyyy-MM-dd', () => {
    expect(formatAppDate(timestamp, withSettings({ dateFormat: 'yyyy-MM-dd' }))).toBe(
      '2026-06-22'
    );
  });

  it('formats app time with 24h', () => {
    expect(formatAppTime(timestamp, withSettings({ timeFormat: '24h' }))).toBe('14:30');
  });

  it('formats app time with 12h', () => {
    expect(formatAppTime(timestamp, withSettings({ timeFormat: '12h' }))).toBe('2:30 PM');
  });

  it('formats app date time with date and time', () => {
    expect(formatAppDateTime(timestamp, DEFAULT_DISPLAY_FORMAT_SETTINGS)).toBe(
      '22/06/2026 14:30'
    );
  });

  it('formats app month with MM/yyyy', () => {
    expect(formatAppMonth(timestamp, withSettings({ monthFormat: 'MM/yyyy' }))).toBe(
      '06/2026'
    );
  });

  it('formats VND amount with currency default precision', () => {
    expect(formatAppAmount(
      100000,
      'VND',
      withSettings({ amountPrecision: 'currency_default' }),
      'en-US'
    )).toBe('\u20ab100,000');
  });

  it('formats USD amount with currency default precision', () => {
    expect(formatAppAmount(
      1234.5,
      'USD',
      withSettings({ amountPrecision: 'currency_default' }),
      'en-US'
    )).toBe('$1,234.50');
  });

  it('formats amount with integer precision', () => {
    expect(formatAppAmount(
      1234.56,
      'USD',
      withSettings({ amountPrecision: 'integer' }),
      'en-US'
    )).toBe('$1,235');
  });

  it('formats amount without a currency display', () => {
    expect(formatAppAmount(
      1234.5,
      'USD',
      withSettings({ currencyDisplay: 'none' }),
      'en-US'
    )).toBe('1,234.50');
  });

  it('formats amount without grouping separators', () => {
    expect(formatAppAmount(
      1234.5,
      'USD',
      withSettings({ currencyDisplay: 'none', useGrouping: false }),
      'en-US'
    )).toBe('1234.50');
  });

  it('formats amount with currency code display', () => {
    expect(formatAppAmount(
      1234.5,
      'USD',
      withSettings({ currencyDisplay: 'code' }),
      'en-US'
    )).toBe('USD\u00a01,234.50');
  });

  it('formats amount with the currency before the number', () => {
    expect(formatAppAmount(
      100000,
      'VND',
      withSettings({ currencyDisplay: 'code', currencyPosition: 'before' }),
      'en-US'
    )).toBe('VND 100,000');
  });

  it('formats amount with the currency after the number', () => {
    expect(formatAppAmount(
      100000,
      'VND',
      withSettings({ currencyDisplay: 'code', currencyPosition: 'after' }),
      'en-US'
    )).toBe('100,000 VND');
  });

  it('gets the start of week when week starts on monday', () => {
    const start = getStartOfWeek(new Date(2026, 5, 24, 13, 45), withSettings({
      weekStart: 'monday',
    }));

    expect(start).toEqual(new Date(2026, 5, 22, 0, 0, 0, 0));
  });

  it('gets the start of week when week starts on sunday', () => {
    const start = getStartOfWeek(new Date(2026, 5, 24, 13, 45), withSettings({
      weekStart: 'sunday',
    }));

    expect(start).toEqual(new Date(2026, 5, 21, 0, 0, 0, 0));
  });

  it('gets the end of week at the final millisecond of the day', () => {
    const end = getEndOfWeek(new Date(2026, 5, 24, 13, 45), withSettings({
      weekStart: 'monday',
    }));

    expect(end).toEqual(new Date(2026, 5, 28, 23, 59, 59, 999));
  });

  it('does not throw for invalid timestamp or amount values', () => {
    expect(() => formatAppDate(Number.NaN, DEFAULT_DISPLAY_FORMAT_SETTINGS)).not.toThrow();
    expect(() => formatAppTime(Number.NaN, DEFAULT_DISPLAY_FORMAT_SETTINGS)).not.toThrow();
    expect(() => formatAppMonth(Number.NaN, DEFAULT_DISPLAY_FORMAT_SETTINGS)).not.toThrow();
    expect(() => formatAppAmount(Number.NaN, 'VND', DEFAULT_DISPLAY_FORMAT_SETTINGS)).not.toThrow();
    expect(formatAppDate(Number.NaN, DEFAULT_DISPLAY_FORMAT_SETTINGS)).toBe('');
    expect(formatAppAmount(Number.NaN, 'VND', DEFAULT_DISPLAY_FORMAT_SETTINGS)).toBe('');
  });
});
