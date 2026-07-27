import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appLockClock } from '@/app/providers/app-lock-clock';
import {
  invalidateStepUpAuthentication,
  registerStepUpAuthenticationHandler,
  registerStepUpAuthenticationInvalidationHandler,
  requireStepUpAuthentication,
  type StepUpAuthenticationResult,
} from '@/core/auth/step-up-authentication';

vi.mock('@/app/providers/app-lock-clock', () => ({
  appLockClock: { now: vi.fn() },
}));

const now = vi.mocked(appLockClock.now);
let unregister: (() => void) | undefined;

describe('step-up authentication', () => {
  beforeEach(() => {
    invalidateStepUpAuthentication();
    now.mockReset();
    now.mockResolvedValue(1_000);
  });

  afterEach(() => {
    unregister?.();
    unregister = undefined;
  });

  function useHandler(result: StepUpAuthenticationResult = 'SUCCESS') {
    const handler = vi.fn(async () => result);
    unregister = registerStepUpAuthenticationHandler(handler);
    return handler;
  }

  it('reuses a successful authentication for a cacheable action within five minutes', async () => {
    const handler = useHandler();

    await expect(requireStepUpAuthentication('EXPORT_DATA')).resolves.toBe('SUCCESS');
    now.mockResolvedValue(1_000 + 5 * 60 * 1000 - 1);
    await expect(requireStepUpAuthentication('EXPORT_DATA')).resolves.toBe('SUCCESS');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('expires the foreground cache after five minutes', async () => {
    const handler = useHandler();

    await requireStepUpAuthentication('EXPORT_DATA');
    now.mockResolvedValue(1_000 + 5 * 60 * 1000);
    await requireStepUpAuthentication('EXPORT_DATA');

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cache when the app leaves the foreground', async () => {
    const handler = useHandler();

    await requireStepUpAuthentication('EXPORT_DATA');
    invalidateStepUpAuthentication();
    await requireStepUpAuthentication('EXPORT_DATA');

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('notifies the active authentication UI when the app leaves the foreground', () => {
    const invalidationHandler = vi.fn();
    const unregisterInvalidation = registerStepUpAuthenticationInvalidationHandler(
      invalidationHandler,
    );

    invalidateStepUpAuthentication();

    expect(invalidationHandler).toHaveBeenCalledTimes(1);
    unregisterInvalidation();
  });

  it.each(['RESTORE_DATA', 'DELETE_ALL_DATA', 'CHANGE_PIN'] as const)(
    'always authenticates %s freshly',
    async (action) => {
      const handler = useHandler();

      await requireStepUpAuthentication(action);
      await requireStepUpAuthentication(action);

      expect(handler).toHaveBeenCalledTimes(2);
    },
  );

  it('does not cache a cancelled authentication', async () => {
    const handler = useHandler('CANCELLED');

    await requireStepUpAuthentication('EXPORT_DATA');
    await requireStepUpAuthentication('EXPORT_DATA');

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('serializes simultaneous requests and reuses the first successful result', async () => {
    const handler = useHandler();

    await expect(Promise.all([
      requireStepUpAuthentication('EXPORT_DATA'),
      requireStepUpAuthentication('EXPORT_DATA'),
    ])).resolves.toEqual(['SUCCESS', 'SUCCESS']);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('reports when no authentication handler is available', async () => {
    await expect(requireStepUpAuthentication('EXPORT_DATA')).resolves.toBe('NOT_AVAILABLE');
  });
});
