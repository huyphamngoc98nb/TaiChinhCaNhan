import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  platform: 'android' as string,
  consumeDeviceLockSignal: vi.fn(),
  clearDeviceLockSignal: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => mocks.platform,
  },
  registerPlugin: () => ({
    consumeDeviceLockSignal: mocks.consumeDeviceLockSignal,
    clearDeviceLockSignal: mocks.clearDeviceLockSignal,
  }),
}));

import { deviceLock } from '@/app/providers/device-lock';

describe('deviceLock bridge', () => {
  beforeEach(() => {
    mocks.platform = 'android';
    mocks.consumeDeviceLockSignal.mockReset();
    mocks.clearDeviceLockSignal.mockReset();
  });

  it('returns the native one-shot device lock signal', async () => {
    mocks.consumeDeviceLockSignal.mockResolvedValue({ deviceWasLocked: true });

    await expect(deviceLock.consumeSignal()).resolves.toBe(true);
  });

  it('does not treat an unavailable native bridge as a device lock', async () => {
    mocks.consumeDeviceLockSignal.mockRejectedValue(new Error('Plugin unavailable'));

    await expect(deviceLock.consumeSignal()).resolves.toBe(false);
  });

  it('does not query Android keyguard state on other platforms', async () => {
    mocks.platform = 'web';

    await expect(deviceLock.consumeSignal()).resolves.toBe(false);
    expect(mocks.consumeDeviceLockSignal).not.toHaveBeenCalled();
  });
});
