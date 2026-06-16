import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateTimePicker } from '@/shared/components/DateTimePicker';

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'vi',
    t: (key: string) => {
      const messages: Record<string, string> = {
        'date_time.transaction_date': 'Ngày giao dịch',
        'date_time.yesterday': 'Hôm qua',
        'date_time.today': 'Hôm nay',
        'date_time.custom': 'Tùy chọn',
        'date_time.clear': 'Xóa ngày giờ',
        'date_time.select_date': 'Chọn ngày',
        'date_time.invalid': 'Vui lòng chọn ngày và giờ hợp lệ.',
        'date_time.error_required': 'Vui lòng chọn ngày giờ.',
      };
      return messages[key] ?? key;
    },
  }),
}));

function renderPicker(onChange = vi.fn()) {
  const result = render(
    <DateTimePicker
      value={new Date(2026, 0, 2, 10, 30).getTime()}
      onChange={onChange}
    />,
  );

  return { ...result, onChange };
}

describe('DateTimePicker', () => {
  it('clears to null from the app clear action', () => {
    const { onChange } = renderPicker();

    fireEvent.click(screen.getByLabelText('Xóa ngày giờ'));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByText('Vui lòng chọn ngày và giờ hợp lệ.')).toBeTruthy();
    expect(screen.queryByText(/Invalid Date|Invalid time value/i)).toBeNull();
  });

  it('does not emit NaN when the native date input is cleared', () => {
    const { container, onChange } = renderPicker();
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;

    fireEvent.change(dateInput, { target: { value: '' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Vui lòng chọn ngày và giờ hợp lệ.')).toBeTruthy();
    expect(screen.queryByText(/Invalid Date|Invalid time value/i)).toBeNull();
  });

  it('does not emit NaN when the native time input is cleared', () => {
    const { container, onChange } = renderPicker();
    const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement;

    fireEvent.change(timeInput, { target: { value: '' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Vui lòng chọn ngày và giờ hợp lệ.')).toBeTruthy();
    expect(screen.queryByText(/Invalid Date|Invalid time value/i)).toBeNull();
  });

  it('emits a finite timestamp after selecting a valid date again', () => {
    const { container, onChange } = renderPicker();
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;

    fireEvent.change(dateInput, { target: { value: '' } });
    fireEvent.change(dateInput, { target: { value: '2026-01-03' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(Number.isFinite(onChange.mock.calls[0][0])).toBe(true);
  });

  it('emits a finite timestamp after selecting a valid time again', () => {
    const { container, onChange } = renderPicker();
    const timeInput = container.querySelector('input[type="time"]') as HTMLInputElement;

    fireEvent.change(timeInput, { target: { value: '' } });
    fireEvent.change(timeInput, { target: { value: '11:45' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(Number.isFinite(onChange.mock.calls[0][0])).toBe(true);
  });

  it('does not render a preview for invalid timestamps', () => {
    render(
      <DateTimePicker
        value={Number.NaN}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Vui lòng chọn ngày và giờ hợp lệ.')).toBeTruthy();
    expect(screen.queryByText(/Invalid Date|Invalid time value/i)).toBeNull();
  });
});
