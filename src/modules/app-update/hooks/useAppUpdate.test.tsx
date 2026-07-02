import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppUpdate } from './useAppUpdate';

const nativeMock = vi.hoisted(() => ({
  addProgressListener: vi.fn(),
  startUpdate: vi.fn(),
}));

const serviceMock = vi.hoisted(() => ({
  checkForUpdate: vi.fn(),
  getSkippedVersionCode: vi.fn(),
  markVersionSkipped: vi.fn(),
}));

vi.mock('../services/app-update.native', () => ({
  AppUpdatePluginUnavailableError: class AppUpdatePluginUnavailableError extends Error {},
  addAppUpdateDownloadProgressListener: nativeMock.addProgressListener,
  startAndroidUpdate: nativeMock.startUpdate,
}));

vi.mock('../services/app-update.service', () => ({
  APP_UPDATE_ERROR_MESSAGES: {
    checkFailed: 'check failed',
  },
  checkForAndroidUpdate: serviceMock.checkForUpdate,
  getSkippedVersionCode: serviceMock.getSkippedVersionCode,
  markVersionSkipped: serviceMock.markVersionSkipped,
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const updateResult = {
  status: 'update_available' as const,
  currentVersionCode: 120,
  mandatory: false,
  latest: {
    platform: 'android' as const,
    versionName: '0.1.21',
    versionCode: 121,
    mandatory: false,
    apkUrl: 'https://example.com/app.apk',
    sha256: 'abc123',
    releaseNotes: [],
  },
};

describe('useAppUpdate install flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMock.checkForUpdate.mockResolvedValue(updateResult);
    serviceMock.getSkippedVersionCode.mockResolvedValue(null);
    serviceMock.markVersionSkipped.mockResolvedValue(undefined);
  });

  it('does not surface a skipped optional version during automatic checks', async () => {
    serviceMock.getSkippedVersionCode.mockResolvedValue(121);

    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.checkForUpdate();
    });

    expect(serviceMock.getSkippedVersionCode).toHaveBeenCalledTimes(1);
    expect(result.current.availableUpdate).toBeNull();
  });

  it('ignores a skipped version when respectSkippedVersion is false', async () => {
    serviceMock.getSkippedVersionCode.mockResolvedValue(121);

    const { result } = renderHook(() =>
      useAppUpdate({ respectSkippedVersion: false }),
    );
    await act(async () => {
      await result.current.checkForUpdate();
    });

    expect(serviceMock.getSkippedVersionCode).not.toHaveBeenCalled();
    expect(result.current.availableUpdate).toEqual(updateResult);
  });

  it('stores the skipped version when an optional update is dismissed', async () => {
    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.checkForUpdate();
    });
    await act(async () => {
      await result.current.dismissUpdate();
    });

    expect(serviceMock.markVersionSkipped).toHaveBeenCalledWith(121);
    expect(result.current.availableUpdate).toBeNull();
  });

  it('does not dismiss or persist a skipped mandatory update', async () => {
    const mandatoryUpdate = { ...updateResult, mandatory: true };
    serviceMock.checkForUpdate.mockResolvedValue(mandatoryUpdate);

    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.checkForUpdate();
    });
    await act(async () => {
      await result.current.dismissUpdate();
    });

    expect(serviceMock.markVersionSkipped).not.toHaveBeenCalled();
    expect(result.current.availableUpdate).toEqual(mandatoryUpdate);
  });

  it('tracks native progress, prevents duplicates, and removes the listener', async () => {
    const remove = vi.fn(async () => undefined);
    let progressListener: ((event: {
      bytesDownloaded: number;
      totalBytes: number;
      percent: number;
    }) => void) | undefined;
    let resolveInstall: ((value: { status: 'installer_opened' }) => void) | undefined;

    nativeMock.addProgressListener.mockImplementation(async (listener) => {
      progressListener = listener;
      return { remove };
    });
    nativeMock.startUpdate.mockImplementation(
      () => new Promise((resolve) => {
        resolveInstall = resolve;
      }),
    );

    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.checkForUpdate();
    });

    act(() => {
      void result.current.beginUpdate();
      void result.current.beginUpdate();
    });
    await waitFor(() => expect(nativeMock.startUpdate).toHaveBeenCalledTimes(1));
    expect(nativeMock.startUpdate).toHaveBeenCalledWith(updateResult.latest);
    expect(result.current.isUpdating).toBe(true);

    act(() => {
      progressListener?.({ bytesDownloaded: 500, totalBytes: 1000, percent: 50 });
    });
    expect(result.current.installState).toBe('downloading');
    expect(result.current.downloadProgress?.percent).toBe(50);

    act(() => {
      progressListener?.({ bytesDownloaded: 1000, totalBytes: 1000, percent: 100 });
    });
    expect(result.current.installState).toBe('verifying');

    await act(async () => {
      resolveInstall?.({ status: 'installer_opened' });
    });
    await waitFor(() => expect(result.current.installState).toBe('installer_opened'));
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('shows a retryable mapped error and starts a new attempt', async () => {
    const remove = vi.fn(async () => undefined);
    nativeMock.addProgressListener.mockResolvedValue({ remove });
    nativeMock.startUpdate
      .mockRejectedValueOnce({ code: 'APP_UPDATE_DOWNLOAD_FAILED' })
      .mockResolvedValueOnce({ status: 'installer_opened' });

    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.checkForUpdate();
    });
    await act(async () => {
      await result.current.beginUpdate();
    });

    expect(result.current.installState).toBe('error');
    expect(result.current.updateError).toBe('app_update.download_failed');

    await act(async () => {
      await result.current.beginUpdate();
    });
    expect(nativeMock.startUpdate).toHaveBeenCalledTimes(2);
    expect(result.current.installState).toBe('installer_opened');
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('keeps the dialog retryable when install permission is required', async () => {
    const remove = vi.fn(async () => undefined);
    nativeMock.addProgressListener.mockResolvedValue({ remove });
    nativeMock.startUpdate
      .mockRejectedValueOnce({
        code: 'APP_UPDATE_INSTALL_PERMISSION_REQUIRED',
      })
      .mockResolvedValueOnce({ status: 'installer_opened' });

    const { result } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.checkForUpdate();
    });
    await act(async () => {
      await result.current.beginUpdate();
    });

    expect(result.current.installState).toBe('permission_required');
    expect(result.current.updateError).toBe('app_update.install_permission_required');
    expect(result.current.isUpdating).toBe(false);

    await act(async () => {
      await result.current.beginUpdate();
    });

    expect(nativeMock.startUpdate).toHaveBeenCalledTimes(2);
    expect(result.current.installState).toBe('installer_opened');
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('removes the native listener when unmounted during a download', async () => {
    const remove = vi.fn(async () => undefined);
    nativeMock.addProgressListener.mockResolvedValue({ remove });
    nativeMock.startUpdate.mockImplementation(() => new Promise(() => undefined));

    const { result, unmount } = renderHook(() => useAppUpdate());
    await act(async () => {
      await result.current.checkForUpdate();
    });
    act(() => {
      void result.current.beginUpdate();
    });
    await waitFor(() => expect(nativeMock.startUpdate).toHaveBeenCalledTimes(1));

    unmount();
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
  });
});
