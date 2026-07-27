export const DEFAULT_APP_LOCK_TIMEOUT_MS = 2 * 60 * 1000;

export interface MonotonicClock {
  now(): Promise<number>;
}

export class BackgroundTimeoutTracker {
  private backgroundStartedAt: number | null = null;
  private timeoutMs: number | null = DEFAULT_APP_LOCK_TIMEOUT_MS;

  constructor(private readonly clock: MonotonicClock) {}

  async recordBackgroundStarted(
    timeoutMs: number | null = DEFAULT_APP_LOCK_TIMEOUT_MS,
  ): Promise<void> {
    if (this.backgroundStartedAt !== null) return;
    this.timeoutMs = timeoutMs;
    this.backgroundStartedAt = await this.clock.now();
  }

  async consumeForegroundLockRequirement(): Promise<boolean> {
    if (this.backgroundStartedAt === null) return false;

    const backgroundStartedAt = this.backgroundStartedAt;
    this.backgroundStartedAt = null;
    const foregroundAt = await this.clock.now();
    const inactiveDuration = Math.max(0, foregroundAt - backgroundStartedAt);

    return this.timeoutMs !== null && inactiveDuration >= this.timeoutMs;
  }

  reset(): void {
    this.backgroundStartedAt = null;
    this.timeoutMs = DEFAULT_APP_LOCK_TIMEOUT_MS;
  }
}
