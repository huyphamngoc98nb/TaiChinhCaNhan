import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppUpdateDialog } from './AppUpdateDialog';
import { consumeAppBackButton } from '@/shared/utils/app-back-stack';
import type { ComponentProps } from 'react';

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/hooks/useBodyScrollLock', () => ({
  useBodyScrollLock: vi.fn(),
}));

const latest = {
  platform: 'android' as const,
  versionName: '0.1.21',
  versionCode: 121,
  mandatory: false,
  apkUrl: 'https://example.com/app.apk',
  sha256: 'abc123',
  releaseNotes: ['Sửa lỗi sao lưu', 'Cải thiện hiệu năng'],
};

function renderDialog(overrides: Partial<ComponentProps<typeof AppUpdateDialog>> = {}) {
  const props: ComponentProps<typeof AppUpdateDialog> = {
    latest,
    currentVersionCode: 120,
    mandatory: false,
    installState: 'idle',
    isUpdating: false,
    progress: null,
    error: null,
    onUpdate: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };

  render(<AppUpdateDialog {...props} />);
  return props;
}

describe('AppUpdateDialog', () => {
  it('renders version information and release notes', () => {
    renderDialog();

    expect(screen.getByText(/0\.1\.21 \(121\)/)).not.toBeNull();
    expect(screen.getByText(/120/)).not.toBeNull();
    expect(screen.getByText('Sửa lỗi sao lưu')).not.toBeNull();
    expect(screen.getByText('Cải thiện hiệu năng')).not.toBeNull();
    expect(screen.getByText('app_update.skip_this_version')).not.toBeNull();
  });

  it('renders structured release summary, sections, description, and impact', () => {
    renderDialog({
      latest: {
        ...latest,
        releaseSummary: 'Bản cập nhật tập trung vào độ ổn định.',
        releaseNoteSections: [
          {
            type: 'bug_fixes',
            title: 'Sửa lỗi',
            items: [
              {
                title: 'Sửa lỗi đồng bộ số dư',
                description: 'Số dư ví nhận được cập nhật chính xác.',
                impact: 'Không yêu cầu thay đổi dữ liệu.',
              },
            ],
          },
        ],
        releaseNotes: ['Sửa lỗi: Nội dung fallback cho app cũ'],
      },
    });

    expect(screen.getByText('Bản cập nhật tập trung vào độ ổn định.')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Sửa lỗi', level: 4 })).not.toBeNull();
    expect(screen.getByText('Sửa lỗi đồng bộ số dư')).not.toBeNull();
    expect(screen.getByText('Số dư ví nhận được cập nhật chính xác.')).not.toBeNull();
    expect(screen.getByText('Không yêu cầu thay đổi dữ liệu.')).not.toBeNull();
    expect(screen.queryByText('Sửa lỗi: Nội dung fallback cho app cũ')).toBeNull();
  });

  it('renders release-note HTML payloads as inert text', () => {
    const payload = '<script>alert(1)</script>';
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    renderDialog({
      latest: {
        ...latest,
        releaseSummary: payload,
        releaseNoteSections: [
          {
            type: 'security',
            title: payload,
            items: [{ title: payload, description: payload, impact: payload }],
          },
        ],
      },
    });

    const dialog = screen.getByRole('dialog');
    expect(screen.getAllByText(payload)).toHaveLength(5);
    expect(dialog.querySelector('script')).toBeNull();
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('renders a fallback release note when release notes are empty or blank', () => {
    renderDialog({
      latest: { ...latest, releaseNotes: ['', '   '] },
    });

    expect(screen.getByText('app_update.release_notes')).not.toBeNull();
    expect(screen.getByText('app_update.default_release_note')).not.toBeNull();
  });

  it('shows only the update action for mandatory updates', () => {
    renderDialog({ latest: { ...latest, mandatory: true }, mandatory: true });

    expect(screen.queryByText('app_update.skip_this_version')).toBeNull();
    expect(screen.getByText('app_update.update_now')).not.toBeNull();
    expect(screen.getByText('app_update.mandatory_message')).not.toBeNull();
  });

  it('allows an optional update to be skipped explicitly', () => {
    const onDismiss = vi.fn();
    renderDialog({ onDismiss });

    fireEvent.click(screen.getByText('app_update.skip_this_version'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss when the overlay is clicked or Escape is pressed', () => {
    const onDismiss = vi.fn();
    renderDialog({ onDismiss });

    const overlay = screen.getByRole('dialog').parentElement;
    if (!overlay) throw new Error('Expected update dialog overlay');

    fireEvent.click(overlay);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('consumes app-level Back handling while mounted', () => {
    renderDialog();

    expect(consumeAppBackButton()).toBe(true);
  });

  it('keeps keyboard focus inside the blocking dialog', () => {
    const outsideButton = document.createElement('button');
    document.body.append(outsideButton);
    renderDialog();

    outsideButton.focus();

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    outsideButton.remove();
  });

  it('shows determinate download progress and disables actions', () => {
    renderDialog({
      installState: 'downloading',
      isUpdating: true,
      progress: { bytesDownloaded: 500, totalBytes: 1000, percent: 50 },
    });

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByText('50%')).not.toBeNull();
    expect(
      (screen.getByText('app_update.skip_this_version') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByText('app_update.updating') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows indeterminate progress with downloaded bytes', () => {
    renderDialog({
      installState: 'downloading',
      isUpdating: true,
      progress: { bytesDownloaded: 1_572_864, totalBytes: -1, percent: -1 },
    });

    expect(screen.getByRole('status')).not.toBeNull();
    expect(screen.getByText(/1\.5 MB/)).not.toBeNull();
  });

  it('shows a retry button after an error and calls the update action again', () => {
    const onUpdate = vi.fn();
    renderDialog({
      installState: 'error',
      error: 'Native download failed',
      onUpdate,
    });

    fireEvent.click(screen.getByText('app_update.retry'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert').textContent).toBe('Native download failed');
  });

  it('shows the retry action when install permission is required', () => {
    const onUpdate = vi.fn();
    renderDialog({
      installState: 'permission_required',
      error: 'Install permission required',
      onUpdate,
    });

    fireEvent.click(screen.getByText('app_update.retry'));
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert').textContent).toBe('Install permission required');
  });
});
