import { describe, expect, it } from 'vitest';
import {
  createInitialAppLockState,
  reduceAppLockState,
  type AppLockState,
} from '@/app/providers/app-lock-state';

describe('App Lock state', () => {
  it('requires authentication on a protected cold start', () => {
    expect(createInitialAppLockState(true)).toBe('LOCK_REQUIRED');
    expect(createInitialAppLockState(false)).toBe('UNLOCKED_FOREGROUND');
  });

  it('tracks foreground and background without requiring a lock', () => {
    const background = reduceAppLockState('UNLOCKED_FOREGROUND', {
      type: 'APP_MOVED_TO_BACKGROUND',
    });
    const foreground = reduceAppLockState(background, { type: 'APP_MOVED_TO_FOREGROUND' });

    expect(background).toBe('UNLOCKED_BACKGROUND');
    expect(foreground).toBe('UNLOCKED_FOREGROUND');
  });

  it('requires authentication when the background timeout expires', () => {
    expect(
      reduceAppLockState('UNLOCKED_BACKGROUND', { type: 'BACKGROUND_TIMEOUT_EXPIRED' }),
    ).toBe('LOCK_REQUIRED');
    expect(
      reduceAppLockState('UNLOCKED_FOREGROUND', { type: 'BACKGROUND_TIMEOUT_EXPIRED' }),
    ).toBe('UNLOCKED_FOREGROUND');
  });

  it.each(['UNLOCKED_FOREGROUND', 'UNLOCKED_BACKGROUND'] as const)(
    'requires authentication when device lock is detected from %s',
    (state) => {
      expect(reduceAppLockState(state, { type: 'DEVICE_LOCK_DETECTED' })).toBe('LOCK_REQUIRED');
    },
  );

  it.each<AppLockState>(['LOCK_REQUIRED', 'AUTHENTICATING'])(
    'does not bypass %s during lifecycle changes',
    (state) => {
      expect(reduceAppLockState(state, { type: 'APP_MOVED_TO_BACKGROUND' })).toBe(state);
      expect(reduceAppLockState(state, { type: 'APP_MOVED_TO_FOREGROUND' })).toBe(state);
    },
  );

  it('models authentication independently from lifecycle state', () => {
    const authenticating = reduceAppLockState('LOCK_REQUIRED', {
      type: 'AUTHENTICATION_STARTED',
    });
    const failed = reduceAppLockState(authenticating, { type: 'AUTHENTICATION_FAILED' });
    const succeeded = reduceAppLockState(authenticating, { type: 'AUTHENTICATION_SUCCEEDED' });

    expect(authenticating).toBe('AUTHENTICATING');
    expect(failed).toBe('LOCK_REQUIRED');
    expect(succeeded).toBe('UNLOCKED_FOREGROUND');
  });
});
