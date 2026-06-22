import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_DISPLAY_FORMAT_SETTINGS,
  DISPLAY_FORMAT_SETTINGS_CHANGE_EVENT,
  STORAGE_PREFIX,
  getDisplayFormatSettings,
  resetDisplayFormatSettings,
  saveDisplayFormatSettings,
  updateDisplayFormatSettings,
} from './display-format-settings.service';

describe('display format settings service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns defaults when no settings have been saved', () => {
    expect(getDisplayFormatSettings()).toEqual(DEFAULT_DISPLAY_FORMAT_SETTINGS);
  });

  it('persists display format settings through the service wrapper', () => {
    const settings = {
      dateFormat: 'yyyy-MM-dd' as const,
      timeFormat: '12h' as const,
      monthFormat: 'MMM yyyy' as const,
      weekStart: 'sunday' as const,
      currencyDisplay: 'code' as const,
      currencyPosition: 'after' as const,
      useGrouping: false,
      amountPrecision: 'integer' as const,
    };

    saveDisplayFormatSettings(settings);

    expect(getDisplayFormatSettings()).toEqual(settings);
  });

  it('updates only the provided fields', () => {
    saveDisplayFormatSettings({
      ...DEFAULT_DISPLAY_FORMAT_SETTINGS,
      dateFormat: 'MM/dd/yyyy',
      currencyDisplay: 'symbol',
    });

    const updated = updateDisplayFormatSettings({
      currencyDisplay: 'none',
      useGrouping: false,
    });

    expect(updated).toEqual({
      ...DEFAULT_DISPLAY_FORMAT_SETTINGS,
      dateFormat: 'MM/dd/yyyy',
      currencyDisplay: 'none',
      useGrouping: false,
    });
  });

  it('clears saved settings on reset', () => {
    updateDisplayFormatSettings({ dateFormat: 'yyyy-MM-dd' });

    expect(resetDisplayFormatSettings()).toEqual(DEFAULT_DISPLAY_FORMAT_SETTINGS);
    expect(localStorage.getItem(`${STORAGE_PREFIX}dateFormat`)).toBeNull();
  });

  it('falls back to the default date format when storage is invalid', () => {
    localStorage.setItem(`${STORAGE_PREFIX}dateFormat`, 'dd-MM-yyyy');

    expect(getDisplayFormatSettings().dateFormat).toBe(DEFAULT_DISPLAY_FORMAT_SETTINGS.dateFormat);
  });

  it('falls back to the default time format when storage is invalid', () => {
    localStorage.setItem(`${STORAGE_PREFIX}timeFormat`, '24-hour');

    expect(getDisplayFormatSettings().timeFormat).toBe(DEFAULT_DISPLAY_FORMAT_SETTINGS.timeFormat);
  });

  it('falls back to the default month format when storage is invalid', () => {
    localStorage.setItem(`${STORAGE_PREFIX}monthFormat`, 'yyyy/MM');

    expect(getDisplayFormatSettings().monthFormat).toBe(DEFAULT_DISPLAY_FORMAT_SETTINGS.monthFormat);
  });

  it('falls back to the default week start when storage is invalid', () => {
    localStorage.setItem(`${STORAGE_PREFIX}weekStart`, 'saturday');

    expect(getDisplayFormatSettings().weekStart).toBe(DEFAULT_DISPLAY_FORMAT_SETTINGS.weekStart);
  });

  it('falls back to the default currency display when storage is invalid', () => {
    localStorage.setItem(`${STORAGE_PREFIX}currencyDisplay`, 'name');

    expect(getDisplayFormatSettings().currencyDisplay).toBe(
      DEFAULT_DISPLAY_FORMAT_SETTINGS.currencyDisplay
    );
  });

  it('falls back to the default currency position when storage is invalid', () => {
    localStorage.setItem(`${STORAGE_PREFIX}currencyPosition`, 'middle');

    expect(getDisplayFormatSettings().currencyPosition).toBe(
      DEFAULT_DISPLAY_FORMAT_SETTINGS.currencyPosition
    );
  });

  it('falls back to the default amount precision when storage is invalid', () => {
    localStorage.setItem(`${STORAGE_PREFIX}amountPrecision`, 'cents');

    expect(getDisplayFormatSettings().amountPrecision).toBe(
      DEFAULT_DISPLAY_FORMAT_SETTINGS.amountPrecision
    );
  });

  it('parses boolean storage safely for useGrouping', () => {
    localStorage.setItem(`${STORAGE_PREFIX}useGrouping`, 'false');
    expect(getDisplayFormatSettings().useGrouping).toBe(false);

    localStorage.setItem(`${STORAGE_PREFIX}useGrouping`, 'true');
    expect(getDisplayFormatSettings().useGrouping).toBe(true);

    localStorage.setItem(`${STORAGE_PREFIX}useGrouping`, 'yes');
    expect(getDisplayFormatSettings().useGrouping).toBe(
      DEFAULT_DISPLAY_FORMAT_SETTINGS.useGrouping
    );
  });

  it('notifies listeners when settings change', () => {
    const listener = vi.fn();
    window.addEventListener(DISPLAY_FORMAT_SETTINGS_CHANGE_EVENT, listener);

    updateDisplayFormatSettings({ currencyDisplay: 'code' });

    window.removeEventListener(DISPLAY_FORMAT_SETTINGS_CHANGE_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
