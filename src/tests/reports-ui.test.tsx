import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type React from 'react';
import { DateRangePicker } from '../modules/reports/components/DateRangePicker';
import { LanguageProvider } from '@/shared/context/LanguageContext';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: 'en' })),
    set: vi.fn(async () => undefined),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('Reports UI - DateRangePicker', () => {
  it('calls onPresetChange when a new preset is selected', async () => {
    const onPresetChange = vi.fn();
    const onGranularityChange = vi.fn();

    renderWithProviders(
      <DateRangePicker 
        preset="this_month" 
        granularity="day" 
        onPresetChange={onPresetChange} 
        onGranularityChange={onGranularityChange} 
      />
    );

    const presetSelect = await screen.findByLabelText(/Time Period/i);
    fireEvent.change(presetSelect, { target: { value: 'last_30_days' } });

    expect(onPresetChange).toHaveBeenCalledWith('last_30_days');
  });

  it('calls onGranularityChange when a new granularity is selected', async () => {
    const onPresetChange = vi.fn();
    const onGranularityChange = vi.fn();

    renderWithProviders(
      <DateRangePicker 
        preset="this_month" 
        granularity="day" 
        onPresetChange={onPresetChange} 
        onGranularityChange={onGranularityChange} 
      />
    );

    const granularitySelect = await screen.findByLabelText(/Group By/i);
    fireEvent.change(granularitySelect, { target: { value: 'week' } });

    expect(onGranularityChange).toHaveBeenCalledWith('week');
  });
});
