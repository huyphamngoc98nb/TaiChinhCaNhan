import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetDisplayFormatSettings,
  updateDisplayFormatSettings,
} from '@/modules/settings/services/display-format-settings.service';
import { DateTimePicker } from './DateTimePicker';

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => {
      const messages: Record<string, string> = {
        'date_time.transaction_date': 'Transaction date',
        'date_time.yesterday': 'Yesterday',
        'date_time.today': 'Today',
        'date_time.custom': 'Custom',
        'date_time.clear': 'Clear date',
        'date_time.select_date': 'Select date',
        'date_time.invalid': 'Invalid date and time.',
      };
      return messages[key] ?? key;
    },
  }),
}));

describe('DateTimePicker display format integration', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDisplayFormatSettings();
  });

  it('renders the date input display using display format settings', () => {
    updateDisplayFormatSettings({ dateFormat: 'yyyy-MM-dd' });

    render(
      <DateTimePicker
        value={new Date(2026, 0, 2, 10, 30).getTime()}
        onChange={vi.fn()}
      />,
    );

    const matchingInputs = screen.getAllByDisplayValue('2026-01-02');
    expect(matchingInputs.some((input) => input.getAttribute('type') === 'text')).toBe(true);
  });

  it('renders preview using date and time display format settings', () => {
    updateDisplayFormatSettings({ dateFormat: 'MM/dd/yyyy', timeFormat: '12h' });

    render(
      <DateTimePicker
        value={new Date(2026, 0, 2, 10, 30).getTime()}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/01\/02\/2026 10:30 AM/)).toBeTruthy();
  });
});
