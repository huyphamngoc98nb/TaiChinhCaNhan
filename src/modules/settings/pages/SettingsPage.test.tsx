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
  success: vi.fn(),
}));

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
  checkForAndroidUpdate: vi.fn(),
  getCurrentAppVersion: vi.fn(),
  useAppUpdatePrompt: () => ({
    promptForUpdate: vi.fn(),
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
