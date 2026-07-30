import { cleanup, render } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomSheet } from './BottomSheet';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
  },
}));

describe('BottomSheet fullScreenOnAndroid', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('uses the fullscreen keyboard-safe layout in Capacitor Android', () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

    const { container } = render(
      <BottomSheet isOpen onClose={vi.fn()} fullScreenOnAndroid>
        budget form
      </BottomSheet>,
    );

    const panel = container.querySelector('.bottom-sheet-panel');
    expect(panel?.classList.contains('keyboard-safe-bottom-sheet--fullscreen')).toBe(true);
    expect(panel?.classList.contains('rounded-none')).toBe(true);
  });

  it('keeps the regular sheet layout on web', () => {
    const { container } = render(
      <BottomSheet isOpen onClose={vi.fn()} fullScreenOnAndroid>
        budget form
      </BottomSheet>,
    );

    const panel = container.querySelector('.bottom-sheet-panel');
    expect(panel?.classList.contains('keyboard-safe-bottom-sheet--fullscreen')).toBe(false);
    expect(panel?.classList.contains('max-w-md')).toBe(true);
    expect(panel?.classList.contains('rounded-t-[24px]')).toBe(true);
  });
});
