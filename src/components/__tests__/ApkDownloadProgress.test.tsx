import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApkDownloadProgress } from '@/components/ApkDownloadProgress';
import type { ApkDownloadState } from '@/services/apkDownloadService';

function makeState(overrides: Partial<ApkDownloadState> = {}): ApkDownloadState {
  return {
    status: 'downloading',
    apkUrl: 'https://cdn.example.com/app.apk',
    downloadedBytes: 512,
    totalBytes: 1024,
    bytesPerSecond: 1024,
    mandatory: false,
    filePath: null,
    error: null,
    ...overrides,
  };
}

describe('ApkDownloadProgress', () => {
  it('should display correct percentage based on downloadedBytes/totalBytes', () => {
    render(<ApkDownloadProgress state={makeState()} onDismiss={vi.fn()} />);

    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50');
  });

  it('should not render dismiss button when forceUpdate=true', () => {
    render(<ApkDownloadProgress state={makeState({ mandatory: true })} onDismiss={vi.fn()} />);

    expect(screen.queryByText('Để sau')).toBeNull();
    expect(screen.queryByLabelText('Để sau')).toBeNull();
  });
});
