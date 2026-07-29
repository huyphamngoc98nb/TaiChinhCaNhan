import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export type NotificationPermissionStatus =
  | 'granted'
  | 'disabled'
  | 'required'
  | 'delayed';

export interface NotificationReminder {
  id: string;
  hour: number;
  minute: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NotificationReminderSettings {
  dataEntryReminderEnabled: boolean;
  reminders: NotificationReminder[];
  permissionStatus: NotificationPermissionStatus;
  exactAlarmAllowed: boolean;
  notificationPermissionRequested: boolean;
}

interface NotificationRemindersPlugin {
  getSettings(): Promise<NotificationReminderSettings>;
  setGlobalEnabled(options: { enabled: boolean }): Promise<NotificationReminderSettings>;
  addReminder(options: { hour: number; minute: number }): Promise<NotificationReminderSettings>;
  updateReminder(options: {
    id: string;
    hour: number;
    minute: number;
  }): Promise<NotificationReminderSettings>;
  setReminderEnabled(options: {
    id: string;
    enabled: boolean;
  }): Promise<NotificationReminderSettings>;
  deleteReminder(options: { id: string }): Promise<NotificationReminderSettings>;
  requestNotificationPermission(): Promise<NotificationReminderSettings>;
  openNotificationSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
  consumePendingRoute(): Promise<{ route?: string | null }>;
  addListener(
    eventName: 'notificationRoute',
    listener: (event: { route: string }) => void,
  ): Promise<PluginListenerHandle>;
}

const nativeNotificationReminders =
  registerPlugin<NotificationRemindersPlugin>('NotificationReminders');

function assertAndroid() {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error('Notification reminders are only available on Android.');
  }
}

function isValidReminder(value: unknown): value is NotificationReminder {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const reminder = value as Record<string, unknown>;
  return (
    typeof reminder.id === 'string' &&
    reminder.id.length > 0 &&
    Number.isInteger(reminder.hour) &&
    Number(reminder.hour) >= 0 &&
    Number(reminder.hour) <= 23 &&
    Number.isInteger(reminder.minute) &&
    Number(reminder.minute) >= 0 &&
    Number(reminder.minute) <= 59 &&
    typeof reminder.enabled === 'boolean'
  );
}

export function sortNotificationReminders(
  reminders: NotificationReminder[],
): NotificationReminder[] {
  return [...reminders].sort(
    (left, right) =>
      left.hour * 60 + left.minute - (right.hour * 60 + right.minute),
  );
}

export function formatReminderTime(reminder: Pick<NotificationReminder, 'hour' | 'minute'>) {
  return `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`;
}

export function hasDuplicateReminderTime(
  reminders: NotificationReminder[],
  hour: number,
  minute: number,
  excludingId?: string,
) {
  return reminders.some(
    (reminder) =>
      reminder.id !== excludingId &&
      reminder.hour === hour &&
      reminder.minute === minute,
  );
}

function normalizeSettings(
  settings: NotificationReminderSettings,
): NotificationReminderSettings {
  const reminders = Array.isArray(settings.reminders)
    ? settings.reminders.filter(isValidReminder)
    : [];
  const permissionStatuses: NotificationPermissionStatus[] = [
    'granted',
    'disabled',
    'required',
    'delayed',
  ];

  return {
    dataEntryReminderEnabled: settings.dataEntryReminderEnabled === true,
    reminders: sortNotificationReminders(reminders),
    permissionStatus: permissionStatuses.includes(settings.permissionStatus)
      ? settings.permissionStatus
      : 'disabled',
    exactAlarmAllowed: settings.exactAlarmAllowed === true,
    notificationPermissionRequested:
      settings.notificationPermissionRequested === true,
  };
}

async function mutate(
  operation: () => Promise<NotificationReminderSettings>,
): Promise<NotificationReminderSettings> {
  assertAndroid();
  return normalizeSettings(await operation());
}

export const notificationReminders = {
  async getSettings() {
    assertAndroid();
    return normalizeSettings(await nativeNotificationReminders.getSettings());
  },

  setGlobalEnabled(enabled: boolean) {
    return mutate(() => nativeNotificationReminders.setGlobalEnabled({ enabled }));
  },

  addReminder(hour: number, minute: number) {
    return mutate(() => nativeNotificationReminders.addReminder({ hour, minute }));
  },

  updateReminder(id: string, hour: number, minute: number) {
    return mutate(() =>
      nativeNotificationReminders.updateReminder({ id, hour, minute }),
    );
  },

  setReminderEnabled(id: string, enabled: boolean) {
    return mutate(() =>
      nativeNotificationReminders.setReminderEnabled({ id, enabled }),
    );
  },

  deleteReminder(id: string) {
    return mutate(() => nativeNotificationReminders.deleteReminder({ id }));
  },

  requestNotificationPermission() {
    return mutate(() =>
      nativeNotificationReminders.requestNotificationPermission(),
    );
  },

  async openNotificationSettings() {
    assertAndroid();
    await nativeNotificationReminders.openNotificationSettings();
  },

  async openExactAlarmSettings() {
    assertAndroid();
    await nativeNotificationReminders.openExactAlarmSettings();
  },

  async consumePendingRoute(): Promise<string | null> {
    if (Capacitor.getPlatform() !== 'android') return null;
    const result = await nativeNotificationReminders.consumePendingRoute();
    return result.route === '/transactions/new' ? result.route : null;
  },

  async addRouteListener(listener: () => void): Promise<PluginListenerHandle | null> {
    if (Capacitor.getPlatform() !== 'android') return null;
    return nativeNotificationReminders.addListener('notificationRoute', listener);
  },
};

export function isDuplicateReminderError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'DUPLICATE_TIME'
  );
}
