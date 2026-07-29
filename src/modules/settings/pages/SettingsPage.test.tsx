import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { SettingsPage } from './SettingsPage';
import {
  exportErrorLogs,
  isShareCanceledError,
  logAppError,
} from '@/core/telemetry/error.service';

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}));

const checkForUpdateMock = vi.hoisted(() => vi.fn());

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(),
  },
}));

vi.mock('@/core/telemetry/error.service', () => ({
  clearErrorLogs: vi.fn(),
  exportErrorLogs: vi.fn(),
  isShareCanceledError: vi.fn(),
  logAppError: vi.fn(),
}));

vi.mock('@/modules/app-update', () => ({
  AppUpdateDialog: () => <div>AppUpdateDialog</div>,
  getCurrentAndroidVersion: vi.fn(async () => ({
    versionName: '0.1.20',
    versionCode: 120,
  })),
  useAppUpdate: () => ({
    availableUpdate: null,
    beginUpdate: vi.fn(),
    checkForUpdate: checkForUpdateMock,
    dismissUpdate: vi.fn(),
    downloadProgress: null,
    installState: 'idle',
    isChecking: false,
    isUpdating: false,
    updateError: null,
  }),
}));

vi.mock('@/shared/components/Toast/ToastContext', () => ({
  useToast: () => toastMock,
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../components/DatabaseDiagnostics', () => ({
  DatabaseDiagnostics: () => <div>DatabaseDiagnostics</div>,
}));

vi.mock('../components/LanguageSettings', () => ({
  LanguageSettings: () => <div>LanguageSettings</div>,
}));

vi.mock('../components/CurrencySettings', () => ({
  CurrencySettings: () => <div>CurrencySettings</div>,
}));

vi.mock('../components/DisplayFormatSettings', () => ({
  DisplayFormatSettings: () => <div>DisplayFormatSettings</div>,
}));

vi.mock('../components/UiPersonalizationSettings', () => ({
  UiPersonalizationSettings: () => <div>UiPersonalizationSettings</div>,
}));

vi.mock('../components/TransactionInputSettings', () => ({
  TransactionInputSettings: () => <div>TransactionInputSettings</div>,
}));

vi.mock('../components/SecuritySettings', () => ({
  SecuritySettings: () => <div>SecuritySettings</div>,
}));

vi.mock('../components/NotificationReminderSettings', () => ({
  NotificationReminderSettings: () => <div>NotificationReminderSettings</div>,
}));

vi.mock('../components/AppUpdateSettings', () => ({
  AppUpdateSettings: () => <div>AppUpdateSettings</div>,
}));

vi.mock('../components/ThemeSelector', () => ({
  ThemeSelector: () => <div>ThemeSelector</div>,
}));

function renderSettingsPage() {
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage error log export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    vi.mocked(isShareCanceledError).mockReturnValue(false);
    vi.mocked(logAppError).mockResolvedValue(undefined);
    checkForUpdateMock.mockResolvedValue({ status: 'up_to_date' });
  });

  it('shows a friendly message when the Android app is up to date', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    checkForUpdateMock.mockResolvedValue({
      status: 'up_to_date',
      latest: {
        platform: 'android',
        versionName: '0.1.20',
        versionCode: 120,
        mandatory: false,
        apkUrl: 'https://example.com/app.apk',
        sha256: 'abc123',
        releaseNotes: [],
      },
      currentVersionCode: 120,
    });

    renderSettingsPage();
    fireEvent.click(screen.getByText('app_update.check_update'));

    await waitFor(() => expect(checkForUpdateMock).toHaveBeenCalledTimes(1));
    expect(toastMock.success).toHaveBeenCalledWith(
      'app_update.latest_already_installed',
    );
  });

  it('shows the update check error returned by the service', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    checkForUpdateMock.mockResolvedValue({
      status: 'error',
      message: 'Không thể kiểm tra cập nhật. Vui lòng thử lại sau.',
    });

    renderSettingsPage();
    fireEvent.click(screen.getByText('app_update.check_update'));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        'Không thể kiểm tra cập nhật. Vui lòng thử lại sau.',
      ),
    );
  });

  it('explains that APK updates are Android-only on unsupported platforms', async () => {
    checkForUpdateMock.mockResolvedValue({ status: 'unsupported_platform' });

    renderSettingsPage();
    fireEvent.click(screen.getByText('app_update.check_update'));

    await waitFor(() =>
      expect(toastMock.info).toHaveBeenCalledWith('app_update.android_only'),
    );
  });

  it('does not log or show an error when the user cancels sharing logs', async () => {
    const error = new Error('Share canceled');
    vi.mocked(exportErrorLogs).mockRejectedValue(error);
    vi.mocked(isShareCanceledError).mockReturnValue(true);

    renderSettingsPage();
    fireEvent.click(screen.getByText('settings.export_logs'));

    await waitFor(() => expect(exportErrorLogs).toHaveBeenCalledTimes(1));

    expect(isShareCanceledError).toHaveBeenCalledWith(error);
    expect(logAppError).not.toHaveBeenCalled();
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('still logs real export failures and shows the export error toast', async () => {
    const error = new Error('Filesystem write failed');
    vi.mocked(exportErrorLogs).mockRejectedValue(error);

    renderSettingsPage();
    fireEvent.click(screen.getByText('settings.export_logs'));

    await waitFor(() =>
      expect(logAppError).toHaveBeenCalledWith(error, {
        screen: 'SettingsPage',
        action: 'exportErrorLogs',
        userMessage: 'settings.export_logs_failed',
      }),
    );
    expect(toastMock.error).toHaveBeenCalledWith('settings.export_logs_failed');
  });
});
