import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type React from 'react';
import { DateRangePicker } from '../modules/reports/components/DateRangePicker';
import { LanguageProvider } from '@/shared/context/LanguageContext';
import { useState } from 'react';
import type { DateRangePreset } from '../modules/reports/services/build-date-range';
import type { ReportGranularity } from '../modules/reports/domain/report.model';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: 'en' })),
    set: vi.fn(async () => undefined),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

function StatefulDateRangePicker() {
  const [preset, setPreset] = useState<DateRangePreset>('this_week');
  const [granularity, setGranularity] = useState<ReportGranularity>('week');

  return (
    <DateRangePicker
      preset={preset}
      granularity={granularity}
      customRange={{ startDate: 1, endDate: 2 }}
      onPresetChange={setPreset}
      onGranularityChange={setGranularity}
      onCustomRangeChange={vi.fn()}
      onReset={() => {
        setPreset('this_month');
        setGranularity('day');
      }}
    />
  );
}

describe('Reports UI - DateRangePicker', () => {
  it('calls onPresetChange when a new preset is selected', async () => {
    const onPresetChange = vi.fn();
    const onGranularityChange = vi.fn();

    renderWithProviders(
      <DateRangePicker 
        preset="this_month" 
        granularity="day" 
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={onPresetChange} 
        onGranularityChange={onGranularityChange} 
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /This Week/i }));

    expect(onPresetChange).toHaveBeenCalledWith('this_week');
  });

  it('calls onGranularityChange when a new granularity is selected', async () => {
    const onPresetChange = vi.fn();
    const onGranularityChange = vi.fn();

    renderWithProviders(
      <DateRangePicker 
        preset="this_month" 
        granularity="day" 
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={onPresetChange} 
        onGranularityChange={onGranularityChange} 
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const granularityGroup = await screen.findByRole('group', { name: /Group By/i });
    fireEvent.click(within(granularityGroup).getByRole('button', { name: /^Week$/i }));

    expect(onGranularityChange).toHaveBeenCalledWith('week');
  });

  it('keeps the reset button space reserved while disabling it in the default state', async () => {
    const { rerender } = renderWithProviders(
      <DateRangePicker
        preset="this_month"
        granularity="day"
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={vi.fn()}
        onGranularityChange={vi.fn()}
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const resetButton = await screen.findByTitle(/Reset filters/i);

    expect(resetButton.getAttribute('disabled')).not.toBeNull();
    expect(resetButton.getAttribute('aria-hidden')).toBe('true');
    expect(resetButton.className).toContain('invisible');
    expect(resetButton.className).toContain('pointer-events-none');
    expect(resetButton.className).toContain('h-9');
    expect(resetButton.className).toContain('w-9');

    rerender(
      <LanguageProvider>
        <DateRangePicker
          preset="this_week"
          granularity="day"
          customRange={{ startDate: 1, endDate: 2 }}
          onPresetChange={vi.fn()}
          onGranularityChange={vi.fn()}
          onCustomRangeChange={vi.fn()}
          onReset={vi.fn()}
        />
      </LanguageProvider>
    );
    expect(screen.getByRole('button', { name: /Reset filters/i }).className).not.toContain('invisible');

    rerender(
      <LanguageProvider>
        <DateRangePicker
          preset="this_month"
          granularity="week"
          customRange={{ startDate: 1, endDate: 2 }}
          onPresetChange={vi.fn()}
          onGranularityChange={vi.fn()}
          onCustomRangeChange={vi.fn()}
          onReset={vi.fn()}
        />
      </LanguageProvider>
    );
    expect(screen.getByRole('button', { name: /Reset filters/i }).className).not.toContain('invisible');
  });

  it('shows both date inputs for a custom range', async () => {
    renderWithProviders(
      <DateRangePicker
        preset="custom"
        granularity="day"
        customRange={{ startDate: 1, endDate: 2 }}
        onPresetChange={vi.fn()}
        onGranularityChange={vi.fn()}
        onCustomRangeChange={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(await screen.findByLabelText(/Start date/i)).toBeTruthy();
    expect(screen.getByLabelText(/End date/i)).toBeTruthy();
  });

  it('shows reset for changed filters and resets them to the default state', async () => {
    renderWithProviders(<StatefulDateRangePicker />);

    const resetButton = await screen.findByRole('button', { name: /Reset filters/i });
    expect(resetButton.getAttribute('disabled')).toBeNull();
    expect(resetButton.className).not.toContain('invisible');

    fireEvent.click(resetButton);

    expect(screen.getByRole('button', { name: /This Month/i }).className).toContain('bg-gray-900');
    const granularityGroup = screen.getByRole('group', { name: /Group By/i });
    expect(within(granularityGroup).getByRole('button', { name: /^Day$/i }).className).toContain('bg-white');
    expect(screen.getByTitle(/Reset filters/i).getAttribute('disabled')).not.toBeNull();
  });
});
