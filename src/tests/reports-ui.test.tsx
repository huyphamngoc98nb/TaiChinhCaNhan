import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker } from '../modules/reports/components/DateRangePicker';

describe('Reports UI - DateRangePicker', () => {
  it('calls onPresetChange when a new preset is selected', () => {
    const onPresetChange = vi.fn();
    const onGranularityChange = vi.fn();

    render(
      <DateRangePicker 
        preset="this_month" 
        granularity="day" 
        onPresetChange={onPresetChange} 
        onGranularityChange={onGranularityChange} 
      />
    );

    const presetSelect = screen.getByLabelText(/Time Period/i);
    fireEvent.change(presetSelect, { target: { value: 'last_30_days' } });

    expect(onPresetChange).toHaveBeenCalledWith('last_30_days');
  });

  it('calls onGranularityChange when a new granularity is selected', () => {
    const onPresetChange = vi.fn();
    const onGranularityChange = vi.fn();

    render(
      <DateRangePicker 
        preset="this_month" 
        granularity="day" 
        onPresetChange={onPresetChange} 
        onGranularityChange={onGranularityChange} 
      />
    );

    const granularitySelect = screen.getByLabelText(/Group By/i);
    fireEvent.change(granularitySelect, { target: { value: 'week' } });

    expect(onGranularityChange).toHaveBeenCalledWith('week');
  });
});
