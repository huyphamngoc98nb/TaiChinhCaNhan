import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/core/telemetry/logger';
import { AppUpdateGate } from './AppUpdateGate';
import {
  checkForAndroidUpdate,
  markVersionSkipped,
  shouldPromptUpdate,
} from '../services/app-update.service';
import type { AppUpdateCheckResult } from '../types/app-update.types';

const confirmMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
  },
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: loggerMock,
}));

vi.mock('@/shared/components/ConfirmDialog/ConfirmContext', () => ({
  useConfirm: () => ({
    confirm: confirmMock,
  }),
}));

vi.mock('@/shared/components/Toast/ToastContext', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (path: string) => path,
  }),
}));

vi.mock('../services/app-update.service', () => ({
  DEFAULT_ANDROID_UPDATE_MANIFEST_URL:
    'https://huyphamngoc98nb.github.io/TaiChinhCaNhan/latest.json',
  checkForAndroidUpdate: vi.fn(),
  markVersionSkipped: vi.fn(),
  shouldPromptUpdate: vi.fn(),
}));

function updateResult(overrides: Partial<AppUpdateCheckResult> = {}): AppUpdateCheckResult {
  return {
    platform: 'android',
    current: {
      platform: 'android',
      versionName: '0.1.14',
      versionCode: 114,
      build: '114',
    },
    latest: {
      platform: 'android',
      versionName: '0.1.15',
      versionCode: 115,
      apkUrl: 'https://example.com/app.apk',
      releaseNotes: ['One fix'],
    },
    updateAvailable: true,
    mandatory: false,
    skipped: false,
    status: 'update-available',
    ...overrides,
  };
}

describe('AppUpdateGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(shouldPromptUpdate).mockReturnValue(true);
    vi.mocked(checkForAndroidUpdate).mockResolvedValue(updateResult());
    vi.mocked(markVersionSkipped).mockResolvedValue(undefined);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    confirmMock.mockResolvedValue(true);
    Object.defineProperty(window, 'open', {
      configurable: true,
      value: vi.fn(() => ({})),
    });
  });

  it('does not open a prompt when no update should be shown', async () => {
    vi.mocked(shouldPromptUpdate).mockReturnValue(false);

    render(<AppUpdateGate />);

    await waitFor(() => expect(checkForAndroidUpdate).toHaveBeenCalledTimes(1));
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('opens the APK URL when the user accepts an optional update', async () => {
    render(<AppUpdateGate />);

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        'https://example.com/app.apk',
        '_system',
        'noopener,noreferrer',
      ),
    );
    expect(markVersionSkipped).not.toHaveBeenCalled();
  });

  it('marks an optional update as skipped when the user chooses later', async () => {
    confirmMock.mockResolvedValue(false);

    render(<AppUpdateGate />);

    await waitFor(() => expect(markVersionSkipped).toHaveBeenCalledWith(115));
  });

  it('hides cancel for mandatory updates and does not mark skipped', async () => {
    vi.mocked(checkForAndroidUpdate).mockResolvedValue(updateResult({ mandatory: true }));
    confirmMock.mockResolvedValue(false);

    render(<AppUpdateGate />);

    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'app_update.mandatory_title',
          hideCancel: true,
          cancelText: undefined,
        }),
      ),
    );
    expect(markVersionSkipped).not.toHaveBeenCalled();
  });

  it('logs and shows a soft failure when auto-check throws unexpectedly', async () => {
    const error = new Error('unexpected');
    vi.mocked(checkForAndroidUpdate).mockRejectedValue(error);

    render(<AppUpdateGate />);

    await waitFor(() =>
      expect(logger.warn).toHaveBeenCalledWith(
        'Android update auto-check failed unexpectedly.',
        error,
        expect.objectContaining({
          context: 'AppUpdate.check',
          metadata: expect.objectContaining({
            action: 'auto-check-on-open',
            manifestUrl: 'https://huyphamngoc98nb.github.io/TaiChinhCaNhan/latest.json',
            platform: 'android',
            status: 'unexpected-error',
          }),
        }),
      ),
    );
    expect(showToastMock).toHaveBeenCalledWith('app_update.checking_update_failed', 'error');
  });
});
