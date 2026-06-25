import { describe, expect, it } from 'vitest';
import { isShareCanceledError } from './error.service';

describe('isShareCanceledError', () => {
  it('detects Capacitor Share canceled errors', () => {
    expect(isShareCanceledError(new Error('Share canceled'))).toBe(true);
    expect(isShareCanceledError(new Error('Share cancelled'))).toBe(true);
    expect(isShareCanceledError('User cancelled share')).toBe(true);
    expect(isShareCanceledError({ message: 'Share cancelled' })).toBe(true);
  });

  it('does not classify real export failures as share cancellation', () => {
    expect(isShareCanceledError(new Error('Filesystem write failed'))).toBe(false);
    expect(isShareCanceledError(new Error('Share plugin unavailable'))).toBe(false);
  });
});
