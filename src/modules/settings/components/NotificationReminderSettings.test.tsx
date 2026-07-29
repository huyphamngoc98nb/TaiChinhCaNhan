import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationReminderSettings } from './NotificationReminderSettings';
import type { NotificationReminderSettings as ReminderSettings } from '../services/notification-reminders';

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  setGlobalEnabled: vi.fn(),
  addReminder: vi.fn(),
  updateReminder: vi.fn(),
  setReminderEnabled: vi.fn(),
  deleteReminder: vi.fn(),
  requestNotificationPermission: vi.fn(),
  openNotificationSettings: vi.fn(),
  openExactAlarmSettings: vi.fn(),
  confirm: vi.fn(),
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    showToast: vi.fn(),
  },
}));

vi.mock('@capacitor/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@capacitor/core')>();
  return {
    ...original,
    Capacitor: { ...original.Capacitor, getPlatform: () => 'android' },
  };
});

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async () => ({ remove: vi.fn(async () => undefined) })),
  },
}));

vi.mock('@/shared/components/ConfirmDialog/ConfirmContext', () => ({
  useConfirm: () => ({ confirm: mocks.confirm }),
}));

vi.mock('@/shared/components/Toast/ToastContext', () => ({
  useToast: () => mocks.toast,
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../services/notification-reminders', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../services/notification-reminders')>();
  return {
    ...original,
    notificationReminders: {
      getSettings: mocks.getSettings,
      setGlobalEnabled: mocks.setGlobalEnabled,
      addReminder: mocks.addReminder,
      updateReminder: mocks.updateReminder,
      setReminderEnabled: mocks.setReminderEnabled,
      deleteReminder: mocks.deleteReminder,
      requestNotificationPermission: mocks.requestNotificationPermission,
      openNotificationSettings: mocks.openNotificationSettings,
      openExactAlarmSettings: mocks.openExactAlarmSettings,
    },
  };
});

const settings: ReminderSettings = {
  dataEntryReminderEnabled: true,
  reminders: [
    {
      id: 'morning',
      hour: 8,
      minute: 0,
      enabled: true,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'evening',
      hour: 20,
      minute: 30,
      enabled: true,
      createdAt: 2,
      updatedAt: 2,
    },
  ],
  permissionStatus: 'granted',
  exactAlarmAllowed: true,
  notificationPermissionRequested: true,
};

describe('NotificationReminderSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockResolvedValue(settings);
    mocks.setGlobalEnabled.mockResolvedValue({
      ...settings,
      dataEntryReminderEnabled: false,
    });
    mocks.setReminderEnabled.mockResolvedValue(settings);
    mocks.deleteReminder.mockResolvedValue({
      ...settings,
      reminders: settings.reminders.slice(1),
    });
    mocks.confirm.mockResolvedValue(true);
  });

  it('loads and displays multiple configured reminder times', async () => {
    render(<NotificationReminderSettings />);

    expect(await screen.findByText('08:00')).toBeTruthy();
    expect(screen.getByText('20:30')).toBeTruthy();
    expect(mocks.getSettings).toHaveBeenCalled();
  });

  it('turns off the global setting without deleting reminder data', async () => {
    render(<NotificationReminderSettings />);
    const globalSwitch = await screen.findByRole('switch', {
      name: 'settings.notification_daily_toggle',
    });

    fireEvent.click(globalSwitch);

    await waitFor(() =>
      expect(mocks.setGlobalEnabled).toHaveBeenCalledWith(false),
    );
    expect(mocks.deleteReminder).not.toHaveBeenCalled();
  });

  it('toggles and deletes only the selected reminder', async () => {
    render(<NotificationReminderSettings />);
    const reminderSwitch = await screen.findByRole('switch', {
      name: 'settings.notification_reminder_time 08:00',
    });

    fireEvent.click(reminderSwitch);
    await waitFor(() =>
      expect(mocks.setReminderEnabled).toHaveBeenCalledWith('morning', false),
    );

    fireEvent.click(screen.getAllByLabelText('common.delete')[0]);
    await waitFor(() =>
      expect(mocks.deleteReminder).toHaveBeenCalledWith('morning'),
    );
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'settings.notification_delete_title' }),
    );
  });
});
