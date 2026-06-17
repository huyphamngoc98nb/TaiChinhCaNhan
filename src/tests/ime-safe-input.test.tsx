import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CurrencyAmountInput } from '@/shared/components/CurrencyAmountInput';
import { useImeSafeInputValue } from '@/shared/hooks/useImeSafeInputValue';

function ImeSafeTextHarness({ onCommit }: { onCommit: (value: string) => void }) {
  const [value, setValue] = useState('');
  const input = useImeSafeInputValue({
    value,
    onChange: (nextValue) => {
      setValue(nextValue);
      onCommit(nextValue);
    },
  });

  return <input aria-label="search" {...input.inputProps} />;
}

function CurrencyHarness({ onCommit }: { onCommit: (value: string) => void }) {
  const [value, setValue] = useState('');

  return (
    <CurrencyAmountInput
      currency="VND"
      value={value}
      onValueChange={(nextValue) => {
        setValue(nextValue);
        onCommit(nextValue);
      }}
    />
  );
}

describe('IME-safe inputs', () => {
  it('keeps Vietnamese text as a draft and commits only after composition ends', () => {
    const onCommit = vi.fn();
    render(<ImeSafeTextHarness onCommit={onCommit} />);

    const input = screen.getByLabelText('search') as HTMLInputElement;

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'ăn uống' } });

    expect(input.value).toBe('ăn uống');
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('ăn uống');
    expect(input.value).toBe('ăn uống');
  });

  it('does not format currency while Android IME composition is active', () => {
    const onCommit = vi.fn();
    render(<CurrencyHarness onCommit={onCommit} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '1234' } });

    expect(input.value).toBe('1234');
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input);

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('1234');
    expect(input.value).toBe('1.234');
  });

  it('does not sanitize text typed into a money field until composition ends', () => {
    const onCommit = vi.fn();
    render(<CurrencyHarness onCommit={onCommit} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'lương tháng' } });

    expect(input.value).toBe('lương tháng');
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input);

    expect(onCommit).toHaveBeenCalledWith('');
  });
});
