import { Capacitor, registerPlugin } from '@capacitor/core';

interface DeviceLockPlugin {
  consumeDeviceLockSignal(): Promise<{ deviceWasLocked: boolean }>;
  clearDeviceLockSignal(): Promise<void>;
}

const nativeDeviceLock = registerPlugin<DeviceLockPlugin>('DeviceLock');

export const deviceLock = {
  async consumeSignal(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return false;

    try {
      return (await nativeDeviceLock.consumeDeviceLockSignal()).deviceWasLocked;
    } catch {
      // A missing bridge must not turn ordinary lifecycle changes into locks.
      // Protected process starts still begin at LOCK_REQUIRED.
      return false;
    }
  },

  async clearSignal(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') return;

    try {
      await nativeDeviceLock.clearDeviceLockSignal();
    } catch {
      // Best effort for an app binary that predates this native bridge.
    }
  },
};
