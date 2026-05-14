import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApkDownloadState } from '@/services/apkDownloadService';

vi.mock('@/hooks/useApkDownload');

import { useApkDownload } from '@/hooks/useApkDownload';
import { ApkDownloadProgress } from '@/shared/components/ApkDownloadProgress';

const mockUseApkDownload = vi.mocked(useApkDownload);

function makeState(overrides: Partial<ApkDownloadState> = {}): ApkDownloadState {
  return {
    status: 'downloading',
    apkUrl: 'https://example.com/app.apk',
    downloadedBytes: 1024,
    totalBytes: 2048,
    bytesPerSecond: 1024,
    mandatory: false,
    filePath: null,
    error: null,
    ...overrides,
  };
}

function mockDownload(overrides: Partial<ApkDownloadState> = {}, isVisible = true) {
  const dismiss = vi.fn();

  mockUseApkDownload.mockReturnValue({
    state: makeState(overrides),
    start: vi.fn(),
    dismiss,
    isVisible,
  });

  return { dismiss };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ApkDownloadProgress', () => {
  it('should return null when isVisible is false', () => {
    mockDownload({}, false);
    const { container } = render(<ApkDownloadProgress />);

    expect(container.firstChild).toBeNull();
  });

  it('should render progress bar when status=downloading', () => {
    mockDownload({ status: 'downloading' });
    render(<ApkDownloadProgress />);

    expect(screen.getByRole('progressbar', { name: 'Tiến trình tải APK' })).toBeTruthy();
  });

  it('should display correct percentage', () => {
    mockDownload({
      downloadedBytes: 5 * 1024 * 1024,
      totalBytes: 10 * 1024 * 1024,
    });
    render(<ApkDownloadProgress />);

    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('should display "..." when totalBytes is null', () => {
    mockDownload({ totalBytes: null });
    render(<ApkDownloadProgress />);

    expect(screen.getByText('...')).toBeTruthy();
  });

  it('should show dismiss button when mandatory=false', () => {
    mockDownload({ mandatory: false });
    render(<ApkDownloadProgress />);

    expect(screen.getByRole('button', { name: 'Để sau' })).toBeTruthy();
  });

  it('should NOT show dismiss button when mandatory=true', () => {
    mockDownload({ mandatory: true });
    render(<ApkDownloadProgress />);

    expect(screen.queryByRole('button', { name: 'Để sau' })).toBeNull();
  });

  it('should call dismiss when user clicks Để sau', () => {
    const { dismiss } = mockDownload({ mandatory: false });
    render(<ApkDownloadProgress />);

    fireEvent.click(screen.getByRole('button', { name: 'Để sau' }));

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('should show error text when status is error', () => {
    mockDownload({ status: 'error' });
    render(<ApkDownloadProgress />);

    const error = screen.getByText('Tải thất bại. Vui lòng thử lại.');
    expect(error).toBeTruthy();
    expect(error.getAttribute('style')).toContain('color: rgb(239, 68, 68)');
  });

  it('should have correct aria attributes on progress bar', () => {
    mockDownload({
      downloadedBytes: 5 * 1024 * 1024,
      totalBytes: 10 * 1024 * 1024,
    });
    render(<ApkDownloadProgress />);

    const progressbar = screen.getByRole('progressbar', { name: 'Tiến trình tải APK' });
    expect(progressbar.getAttribute('aria-valuenow')).toBe('50');
    expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('should format speed as MB/s when bytesPerSecond > 1MB', () => {
    mockDownload({ bytesPerSecond: 2 * 1024 * 1024 });
    render(<ApkDownloadProgress />);

    expect(screen.getByText('2.0 MB/s')).toBeTruthy();
  });
});
