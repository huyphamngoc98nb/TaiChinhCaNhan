import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DISPLAY_FORMAT_SETTINGS,
  updateDisplayFormatSettings,
} from '@/modules/settings/services/display-format-settings.service';
import { useDisplayFormatSettings } from './useDisplayFormatSettings';

describe('useDisplayFormatSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads current display format settings', () => {
    updateDisplayFormatSettings({ dateFormat: 'yyyy-MM-dd' });

    const { result } = renderHook(() => useDisplayFormatSettings());

    expect(result.current.dateFormat).toBe('yyyy-MM-dd');
  });

  it('reloads settings when the service dispatches a change event', () => {
    const { result } = renderHook(() => useDisplayFormatSettings());

    expect(result.current).toEqual(DEFAULT_DISPLAY_FORMAT_SETTINGS);

    act(() => {
      updateDisplayFormatSettings({ timeFormat: '12h' });
    });

    expect(result.current.timeFormat).toBe('12h');
  });
});
