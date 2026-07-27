export type AppLockState =
  | 'UNLOCKED_FOREGROUND'
  | 'UNLOCKED_BACKGROUND'
  | 'LOCK_REQUIRED'
  | 'AUTHENTICATING';

export type AppLockEvent =
  | { type: 'APP_MOVED_TO_BACKGROUND' }
  | { type: 'APP_MOVED_TO_FOREGROUND' }
  | { type: 'BACKGROUND_TIMEOUT_EXPIRED' }
  | { type: 'DEVICE_LOCK_DETECTED' }
  | { type: 'AUTHENTICATION_STARTED' }
  | { type: 'AUTHENTICATION_SUCCEEDED' }
  | { type: 'AUTHENTICATION_FAILED' };

export function createInitialAppLockState(requiresUnlock: boolean): AppLockState {
  return requiresUnlock ? 'LOCK_REQUIRED' : 'UNLOCKED_FOREGROUND';
}

/**
 * App lifecycle and App Lock are deliberately separate concerns.
 *
 * Moving to the background records lifecycle state only. It must not close the
 * session, reset navigation, or require authentication by itself. Later phases
 * may raise LOCK_REQUIRED from an explicit timeout or device-lock policy.
 */
export function reduceAppLockState(state: AppLockState, event: AppLockEvent): AppLockState {
  switch (event.type) {
    case 'APP_MOVED_TO_BACKGROUND':
      return state === 'UNLOCKED_FOREGROUND' ? 'UNLOCKED_BACKGROUND' : state;
    case 'APP_MOVED_TO_FOREGROUND':
      return state === 'UNLOCKED_BACKGROUND' ? 'UNLOCKED_FOREGROUND' : state;
    case 'BACKGROUND_TIMEOUT_EXPIRED':
      return state === 'UNLOCKED_BACKGROUND' ? 'LOCK_REQUIRED' : state;
    case 'DEVICE_LOCK_DETECTED':
      return state === 'UNLOCKED_FOREGROUND' || state === 'UNLOCKED_BACKGROUND'
        ? 'LOCK_REQUIRED'
        : state;
    case 'AUTHENTICATION_STARTED':
      return state === 'LOCK_REQUIRED' ? 'AUTHENTICATING' : state;
    case 'AUTHENTICATION_SUCCEEDED':
      return 'UNLOCKED_FOREGROUND';
    case 'AUTHENTICATION_FAILED':
      return state === 'AUTHENTICATING' ? 'LOCK_REQUIRED' : state;
  }
}
