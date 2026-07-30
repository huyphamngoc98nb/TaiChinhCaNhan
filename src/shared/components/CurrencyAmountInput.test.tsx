import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrencyCode } from '@/shared/context/CurrencyContext';
import { consumeAppBackButton } from '@/shared/utils/app-back-stack';
import {
  alignMoneyKeyboardTarget,
  CurrencyAmountInput,
  findNearestFormattedOffset,
  formattedOffsetToRawOffset,
  getMoneyKeyboardScrollContainer,
  rawOffsetToFormattedOffset,
} from './CurrencyAmountInput';

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

function CurrencyHarness({
  initialValue,
  currency = 'VND',
  enableMoneyKeyboard = true,
}: {
  initialValue: string;
  currency?: CurrencyCode;
  enableMoneyKeyboard?: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <CurrencyAmountInput
      value={value}
      onValueChange={setValue}
      currency={currency}
      enableMoneyKeyboard={enableMoneyKeyboard}
    />
  );
}

function selectFormattedRange(input: HTMLInputElement, start: number, end = start) {
  input.setSelectionRange(start, end);
  fireEvent.select(input);
}

describe('CurrencyAmountInput custom keyboard editing', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollBy = vi.fn();
    document.body.classList.remove('money-keyboard-open');
    delete document.body.dataset.moneyKeyboardOwner;
    document.documentElement.style.removeProperty('--money-keyboard-height');
  });

  it('maps caret offsets between the formatted VND display and raw numeric value', () => {
    expect(formattedOffsetToRawOffset('1.234.567', 5, 0)).toBe(4);
    expect(rawOffsetToFormattedOffset('1.234.567', 4, 0)).toBe(5);
    expect(formattedOffsetToRawOffset('1.234,50', 6, 2)).toBe(5);
    expect(rawOffsetToFormattedOffset('1.234,50', 5, 2)).toBe(6);
  });

  it('maps an Android pointer coordinate to the nearest formatted caret boundary', () => {
    const measureText = (text: string) => text.length * 10;

    expect(findNearestFormattedOffset('123.456', 24, measureText)).toBe(2);
    expect(findNearestFormattedOffset('123.456', 26, measureText)).toBe(3);
    expect(findNearestFormattedOffset('123.456', 45, measureText)).toBe(5);
  });

  it('keeps the input read-only, suppresses the native keyboard, and shows a fake caret', () => {
    render(<CurrencyHarness initialValue="123456" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;

    fireEvent.focus(input);

    expect(input.readOnly).toBe(true);
    expect(input.inputMode).toBe('none');
    expect(document.querySelector('[data-money-input-caret="true"]')).toBeTruthy();
    expect(screen.getByLabelText('money_keyboard.title')).toBeTruthy();
  });

  it('inserts a digit at the caret instead of appending it', () => {
    render(<CurrencyHarness initialValue="123456" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);
    selectFormattedRange(input, 3);

    fireEvent.click(screen.getByRole('button', { name: '9' }));

    expect(input.value).toBe('1.239.456');
    expect(input.selectionStart).toBe(5);
  });

  it('backspaces the character before a middle caret', () => {
    render(<CurrencyHarness initialValue="123456" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);
    selectFormattedRange(input, 3);

    fireEvent.click(screen.getByRole('button', { name: 'money_keyboard.backspace' }));

    expect(input.value).toBe('12.456');
    expect(input.selectionStart).toBe(2);
  });

  it('replaces the selected raw digits and preserves VND formatting', () => {
    render(<CurrencyHarness initialValue="123456" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);
    selectFormattedRange(input, 1, 5);

    fireEvent.click(screen.getByRole('button', { name: '9' }));

    expect(input.value).toBe('1.956');
    expect(input.selectionStart).toBe(3);
  });

  it('edits currencies with decimal digits without losing the fraction', () => {
    render(<CurrencyHarness initialValue="1234.56" currency="USD" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);
    selectFormattedRange(input, 3);

    fireEvent.click(screen.getByRole('button', { name: '9' }));

    expect(input.value).toBe('12.934,56');
    expect(input.selectionStart).toBe(4);
  });

  it('closes the keyboard and removes the caret overlay when Done is tapped', () => {
    render(<CurrencyHarness initialValue="123456" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);

    fireEvent.click(screen.getByRole('button', { name: 'money_keyboard.done' }));

    expect(screen.queryByLabelText('money_keyboard.title')).toBeNull();
    expect(document.querySelector('[data-money-input-selection-overlay="true"]')).toBeNull();
  });

  it('uses the native decimal input when the custom keyboard setting is disabled', () => {
    render(<CurrencyHarness initialValue="1234.5" currency="USD" enableMoneyKeyboard={false} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);

    expect(input.readOnly).toBe(false);
    expect(input.inputMode).toBe('decimal');
    expect(screen.queryByLabelText('money_keyboard.title')).toBeNull();
    expect(document.querySelector('[data-money-input-selection-overlay="true"]')).toBeNull();
  });

  it('aligns the amount against the measured keyboard edge with an exact scroll delta', () => {
    const scrollContainer = document.createElement('div');
    const target = document.createElement('div');
    scrollContainer.scrollBy = vi.fn();
    vi.spyOn(scrollContainer, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 640,
      left: 0,
      right: 320,
      width: 320,
      height: 640,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      top: 320,
      bottom: 430,
      left: 16,
      right: 304,
      width: 288,
      height: 110,
      x: 16,
      y: 320,
      toJSON: () => ({}),
    });

    expect(alignMoneyKeyboardTarget({
      target,
      scrollContainer,
      keyboardTop: 400,
      reducedMotion: false,
    })).toBe(54);
    expect(scrollContainer.scrollBy).toHaveBeenCalledWith({
      top: 54,
      behavior: 'smooth',
    });
  });

  it('prefers the explicit modal body over a nested overflow ancestor', () => {
    render(
      <div data-modal-scroll-container="true" data-testid="modal-scroll">
        <div style={{ overflowY: 'auto' }}>
          <CurrencyHarness initialValue="1000" />
        </div>
      </div>,
    );

    const input = screen.getByRole('textbox');
    expect(getMoneyKeyboardScrollContainer(input)).toBe(screen.getByTestId('modal-scroll'));
  });

  it('adds keyboard-safe padding to the budget form body and restores it after Done', async () => {
    render(
      <div data-budget-form="true" data-testid="budget-form">
        <div
          data-modal-scroll-container="true"
          data-testid="modal-scroll"
          style={{ paddingBottom: '12px' }}
        >
          <div data-keyboard-scroll-target="true">
            <CurrencyHarness initialValue="1000" />
          </div>
          <div data-keyboard-hide-on-open="true">save footer</div>
        </div>
      </div>,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    const form = screen.getByTestId('budget-form');
    const scrollContainer = screen.getByTestId('modal-scroll');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(form.getAttribute('data-money-keyboard-active')).toBe('true');
      expect(scrollContainer.style.paddingBottom).toContain('396px');
      expect(scrollContainer.style.paddingBottom).toContain('env(safe-area-inset-bottom)');
    });

    fireEvent.click(screen.getByRole('button', { name: 'money_keyboard.done' }));

    await waitFor(() => {
      expect(form.hasAttribute('data-money-keyboard-active')).toBe(false);
      expect(scrollContainer.style.paddingBottom).toBe('12px');
      expect(scrollContainer.style.scrollPaddingBottom).toBe('');
      expect(document.body.classList.contains('money-keyboard-open')).toBe(false);
    });
  });

  it('consumes Android Back by closing the money keyboard before the sheet handler', () => {
    render(<CurrencyHarness initialValue="1000" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(input);

    expect(screen.getByLabelText('money_keyboard.title')).toBeTruthy();
    expect(document.activeElement).toBe(input);

    let consumed = false;
    act(() => {
      consumed = consumeAppBackButton();
    });

    expect(consumed).toBe(true);
    expect(screen.queryByLabelText('money_keyboard.title')).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it.each([320, 360, 375, 414])(
    'restores and reopens the custom keyboard at a %ipx compact viewport',
    (viewportWidth) => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: viewportWidth,
      });

      render(
        <div data-budget-form="true">
          <div data-modal-scroll-container="true">
            <div data-keyboard-scroll-target="true">
              <CurrencyHarness initialValue="999999999999999" />
            </div>
          </div>
        </div>,
      );
      const input = screen.getByRole('textbox') as HTMLInputElement;

      fireEvent.focus(input);
      expect(screen.getByLabelText('money_keyboard.title')).toBeTruthy();
      expect(input.value).toBe('999.999.999.999.999');

      fireEvent.click(screen.getByRole('button', { name: 'money_keyboard.done' }));
      expect(screen.queryByLabelText('money_keyboard.title')).toBeNull();

      fireEvent.click(input);
      expect(screen.getByLabelText('money_keyboard.title')).toBeTruthy();
    },
  );
});
