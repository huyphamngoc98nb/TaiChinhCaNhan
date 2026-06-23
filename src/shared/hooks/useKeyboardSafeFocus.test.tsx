import { act, cleanup, render, screen } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardSafeFocus } from './useKeyboardSafeFocus';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
  },
}));

const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
const originalScrollBy = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollBy');

function KeyboardSafeFocusHarness() {
  useKeyboardSafeFocus();

  return (
    <>
      <input aria-label="first input" />
      <input aria-label="second input" />
      <input aria-label="money input" data-money-keyboard-input="true" />
    </>
  );
}

function installVisualViewport(height = 800, offsetTop = 0) {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: 800,
  });

  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      height,
      offsetTop,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
}

function restorePrototypeProperty(prototype: object, property: string, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(prototype, property, descriptor);
    return;
  }

  Reflect.deleteProperty(prototype, property);
}

describe('useKeyboardSafeFocus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(Element.prototype, 'scrollBy', {
      configurable: true,
      value: vi.fn(),
    });
    installVisualViewport();
    document.body.className = '';
    document.documentElement.style.removeProperty('--visual-viewport-height');
    document.documentElement.style.removeProperty('--keyboard-inset-bottom');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    restorePrototypeProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView);
    restorePrototypeProperty(Element.prototype, 'scrollBy', originalScrollBy);
    document.body.className = '';
    document.documentElement.style.removeProperty('--visual-viewport-height');
    document.documentElement.style.removeProperty('--keyboard-inset-bottom');
  });

  it('adds keyboard-focus-active immediately for Android editable focus', () => {
    render(<KeyboardSafeFocusHarness />);

    act(() => {
      screen.getByLabelText('first input').focus();
    });

    expect(document.body.classList.contains('keyboard-focus-active')).toBe(true);
  });

  it('keeps keyboard-focus-active while focus moves between editable fields', () => {
    render(<KeyboardSafeFocusHarness />);

    act(() => {
      screen.getByLabelText('first input').focus();
    });

    act(() => {
      screen.getByLabelText('second input').focus();
      vi.advanceTimersByTime(180);
    });

    expect(document.body.classList.contains('keyboard-focus-active')).toBe(true);
  });

  it('removes keyboard-focus-active after blur settles outside editable fields', () => {
    render(<KeyboardSafeFocusHarness />);
    const input = screen.getByLabelText('first input');

    act(() => {
      input.focus();
      input.blur();
      vi.advanceTimersByTime(179);
    });

    expect(document.body.classList.contains('keyboard-focus-active')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(document.body.classList.contains('keyboard-focus-active')).toBe(false);
  });

  it('does not mark money keyboard inputs as keyboard-focus-active', () => {
    render(<KeyboardSafeFocusHarness />);

    act(() => {
      screen.getByLabelText('money input').focus();
    });

    expect(document.body.classList.contains('keyboard-focus-active')).toBe(false);
  });

  it('cleans up keyboard body classes on unmount', () => {
    installVisualViewport(600);
    const { unmount } = render(<KeyboardSafeFocusHarness />);

    expect(document.body.classList.contains('keyboard-open')).toBe(true);

    act(() => {
      screen.getByLabelText('first input').focus();
    });

    expect(document.body.classList.contains('keyboard-focus-active')).toBe(true);

    unmount();

    expect(document.body.classList.contains('keyboard-open')).toBe(false);
    expect(document.body.classList.contains('keyboard-focus-active')).toBe(false);
  });
});
