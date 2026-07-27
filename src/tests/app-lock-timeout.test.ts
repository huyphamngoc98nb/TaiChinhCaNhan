import { describe, expect, it, vi } from 'vitest';
import {
  BackgroundTimeoutTracker,
  DEFAULT_APP_LOCK_TIMEOUT_MS,
  type MonotonicClock,
} from '@/app/providers/app-lock-timeout';

function clockWithTimes(...times: number[]): MonotonicClock {
  return { now: vi.fn(async () => times.shift() ?? 0) };
}

describe('BackgroundTimeoutTracker', () => {
  it('does not lock before two minutes', async () => {
    const tracker = new BackgroundTimeoutTracker(clockWithTimes(1_000, 120_999));

    await tracker.recordBackgroundStarted();

    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(false);
  });

  it('locks at exactly two minutes', async () => {
    const tracker = new BackgroundTimeoutTracker(
      clockWithTimes(1_000, 1_000 + DEFAULT_APP_LOCK_TIMEOUT_MS),
    );

    await tracker.recordBackgroundStarted();

    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(true);
  });

  it('records only the first of duplicate background events', async () => {
    const clock = clockWithTimes(5_000, 5_000 + DEFAULT_APP_LOCK_TIMEOUT_MS);
    const tracker = new BackgroundTimeoutTracker(clock);

    await tracker.recordBackgroundStarted();
    await tracker.recordBackgroundStarted();

    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(true);
    expect(clock.now).toHaveBeenCalledTimes(2);
  });

  it('keeps the timeout selected when the current background interval began', async () => {
    const tracker = new BackgroundTimeoutTracker(clockWithTimes(1_000, 121_000));

    await tracker.recordBackgroundStarted(5 * 60 * 1000);
    await tracker.recordBackgroundStarted(0);

    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(false);
  });

  it('consumes a background interval only once', async () => {
    const tracker = new BackgroundTimeoutTracker(clockWithTimes(0, DEFAULT_APP_LOCK_TIMEOUT_MS));

    await tracker.recordBackgroundStarted();

    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(true);
    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(false);
  });

  it('treats a backwards fallback clock as zero elapsed time', async () => {
    const tracker = new BackgroundTimeoutTracker(clockWithTimes(10_000, 5_000));

    await tracker.recordBackgroundStarted();

    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(false);
  });

  it('locks after a configured 30 second timeout', async () => {
    const tracker = new BackgroundTimeoutTracker(clockWithTimes(1_000, 32_000));

    await tracker.recordBackgroundStarted(30_000);

    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(true);
  });

  it('does not lock before a configured five minute timeout', async () => {
    const tracker = new BackgroundTimeoutTracker(clockWithTimes(1_000, 121_000));

    await tracker.recordBackgroundStarted(5 * 60 * 1000);

    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(false);
  });

  it('locks immediately for a real background transition', async () => {
    const tracker = new BackgroundTimeoutTracker(clockWithTimes(1_000, 1_000));

    await tracker.recordBackgroundStarted(0);

    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(true);
  });

  it('never locks from elapsed background time when automatic locking is disabled', async () => {
    const tracker = new BackgroundTimeoutTracker(clockWithTimes(1_000, 86_401_000));

    await tracker.recordBackgroundStarted(null);

    await expect(tracker.consumeForegroundLockRequirement()).resolves.toBe(false);
  });
});
