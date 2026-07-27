import { Capacitor, registerPlugin } from '@capacitor/core';
import type { MonotonicClock } from './app-lock-timeout';

interface AppLockClockPlugin {
  getElapsedRealtime(): Promise<{ elapsedRealtime: number }>;
}

const nativeAppLockClock = registerPlugin<AppLockClockPlugin>('AppLockClock');

export const appLockClock: MonotonicClock = {
  async now(): Promise<number> {
    if (Capacitor.getPlatform() === 'android') {
      try {
        const result = await nativeAppLockClock.getElapsedRealtime();
        return result.elapsedRealtime;
      } catch {
        // Keep a monotonic fallback for web bundles running before a native
        // update has registered the bridge. Wall-clock time is never used.
      }
    }

    return performance.now();
  },
};
