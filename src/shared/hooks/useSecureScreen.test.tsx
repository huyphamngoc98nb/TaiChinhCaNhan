import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  setSecure: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
  },
  registerPlugin: () => ({
    setSecure: mocks.setSecure,
  }),
}));

import { useSecureScreen } from './useSecureScreen';

function SensitiveScreen() {
  useSecureScreen();
  return <div>Sensitive</div>;
}

describe('useSecureScreen', () => {
  beforeEach(() => {
    mocks.setSecure.mockReset();
    mocks.setSecure.mockResolvedValue(undefined);
  });

  it('acquires and releases a stable native secure-screen token', () => {
    const view = render(<SensitiveScreen />);
    const acquire = mocks.setSecure.mock.calls[0][0];

    expect(acquire.enabled).toBe(true);
    expect(acquire.token).toMatch(/^secure-screen-/);

    view.unmount();

    expect(mocks.setSecure).toHaveBeenLastCalledWith({
      token: acquire.token,
      enabled: false,
    });
  });
});
