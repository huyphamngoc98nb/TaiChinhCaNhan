import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  Bell,
  Clock3,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { useConfirm } from '@/shared/components/ConfirmDialog/ConfirmContext';
import { useToast } from '@/shared/components/Toast/ToastContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { logger } from '@/core/telemetry/logger';
import {
  formatReminderTime,
  hasDuplicateReminderTime,
  isDuplicateReminderError,
  notificationReminders,
  type NotificationReminder,
  type NotificationReminderSettings as ReminderSettings,
} from '../services/notification-reminders';

interface TimePickerState {
  reminder: NotificationReminder | null;
  value: string;
}

function ReminderSwitch({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="shrink-0 disabled:opacity-50"
    >
      <span
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300'
        }`}
        aria-hidden="true"
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );
}

function TimePickerSheet({
  state,
  duplicate,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  state: TimePickerState | null;
  duplicate: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state) return;
    window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      try {
        if (input.showPicker) input.showPicker();
      } catch {
        // Some WebView versions require a second direct tap on the time field.
      }
    }, 250);
  }, [state]);

  return (
    <BottomSheet
      isOpen={state !== null}
      onClose={onClose}
      transitionKey={state?.reminder?.id ?? 'new-reminder'}
      logContext="NotificationReminderTimePicker"
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-[18px] font-bold text-text">
            {state?.reminder
              ? t('settings.notification_edit_time')
              : t('settings.notification_add_time')}
          </h3>
          <p className="mt-1 text-[12px] text-muted">
            {t('settings.notification_time_picker_desc')}
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-[13px] font-semibold text-muted">
            {t('settings.notification_reminder_time')}
          </span>
          <div className="relative">
            <Clock3
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary"
            />
            <input
              ref={inputRef}
              type="time"
              step={60}
              value={state?.value ?? ''}
              onChange={(event) => onChange(event.target.value)}
              className="h-[54px] w-full rounded-[14px] border border-border bg-bg-subtle pl-12 pr-4 text-[18px] font-bold text-text outline-none focus:border-primary"
            />
          </div>
        </label>

        {duplicate && (
          <p role="alert" className="text-[12px] font-semibold text-rose-600">
            {t('settings.notification_duplicate_time')}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 flex-1 rounded-[12px] bg-surface-muted text-[14px] font-semibold text-muted"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || duplicate || !state?.value}
            className="h-11 flex-1 rounded-[12px] bg-primary text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

export function NotificationReminderSettings() {
  const isAndroid = Capacitor.getPlatform() === 'android';
  const { t } = useLanguage();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [picker, setPicker] = useState<TimePickerState | null>(null);
  const [loading, setLoading] = useState(isAndroid);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!isAndroid) return;
    try {
      setSettings(await notificationReminders.getSettings());
    } catch (error) {
      logger.warn('Unable to load notification reminder settings', error);
      toast.error(t('settings.notification_load_failed'));
    } finally {
      setLoading(false);
    }
  }, [isAndroid, t, toast]);

  useEffect(() => {
    if (!isAndroid) return;
    let removeListener: (() => Promise<void>) | undefined;
    void loadSettings();
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void loadSettings();
    }).then((listener) => {
      removeListener = () => listener.remove();
    });
    return () => {
      if (removeListener) void removeListener();
    };
  }, [isAndroid, loadSettings]);

  const apply = useCallback(async (
    action: () => Promise<ReminderSettings>,
    logAction: string,
  ) => {
    setSaving(true);
    try {
      const result = await action();
      setSettings(result);
      return result;
    } catch (error) {
      logger.warn(`Notification reminder action failed: ${logAction}`, error);
      if (isDuplicateReminderError(error)) {
        toast.error(t('settings.notification_duplicate_time'));
      } else {
        toast.error(t('settings.notification_save_failed'));
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, [t, toast]);

  const requestPermissionWithRationale = useCallback(async () => {
    const shouldRequest = await confirm({
      title: t('settings.notification_permission_title'),
      message: t('settings.notification_permission_rationale'),
      confirmText: t('settings.notification_permission_continue'),
      cancelText: t('common.cancel'),
    });
    if (!shouldRequest) return false;
    const result = await apply(
      () => notificationReminders.requestNotificationPermission(),
      'requestPermission',
    );
    return result !== null;
  }, [apply, confirm, t]);

  const handleGlobalToggle = async (enabled: boolean) => {
    if (
      enabled &&
      settings?.permissionStatus === 'required' &&
      !settings.notificationPermissionRequested
    ) {
      const continued = await requestPermissionWithRationale();
      if (!continued) return;
    }
    await apply(
      () => notificationReminders.setGlobalEnabled(enabled),
      enabled ? 'enableAll' : 'disableAll',
    );
  };

  const openAddPicker = async () => {
    if (
      settings?.reminders.length === 0 &&
      settings.permissionStatus === 'required' &&
      !settings.notificationPermissionRequested
    ) {
      const continued = await requestPermissionWithRationale();
      if (!continued) return;
    }
    setPicker({ reminder: null, value: '08:00' });
  };

  const duplicate = useMemo(() => {
    if (!settings || !picker || !/^\d{2}:\d{2}$/.test(picker.value)) return false;
    const [hour, minute] = picker.value.split(':').map(Number);
    return hasDuplicateReminderTime(
      settings.reminders,
      hour,
      minute,
      picker.reminder?.id,
    );
  }, [picker, settings]);

  const savePicker = async () => {
    if (!picker || duplicate) return;
    const [hour, minute] = picker.value.split(':').map(Number);
    const result = await apply(
      () =>
        picker.reminder
          ? notificationReminders.updateReminder(
              picker.reminder.id,
              hour,
              minute,
            )
          : notificationReminders.addReminder(hour, minute),
      picker.reminder ? 'updateReminder' : 'addReminder',
    );
    if (result) setPicker(null);
  };

  const deleteReminder = async (reminder: NotificationReminder) => {
    const accepted = await confirm({
      title: t('settings.notification_delete_title'),
      message: t('settings.notification_delete_message'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    });
    if (!accepted) return;
    await apply(
      () => notificationReminders.deleteReminder(reminder.id),
      'deleteReminder',
    );
  };

  const openNotificationSystemSettings = async () => {
    await notificationReminders.openNotificationSettings();
  };

  const openExactAlarmSystemSettings = async () => {
    const accepted = await confirm({
      title: t('settings.notification_exact_alarm_title'),
      message: t('settings.notification_exact_alarm_rationale'),
      confirmText: t('settings.notification_open_system_settings'),
      cancelText: t('common.cancel'),
    });
    if (accepted) await notificationReminders.openExactAlarmSettings();
  };

  if (!isAndroid) return null;

  const permissionLabel = settings
    ? t(`settings.notification_status_${settings.permissionStatus}`)
    : t('common.loading');
  const permissionTone =
    settings?.permissionStatus === 'granted'
      ? 'text-emerald-700 bg-emerald-50'
      : settings?.permissionStatus === 'delayed'
        ? 'text-amber-700 bg-amber-50'
        : 'text-rose-700 bg-rose-50';

  return (
    <>
      <section
        className="overflow-hidden rounded-[16px] border border-border bg-surface"
        style={{ boxShadow: '0 1px 4px var(--shadow-color)' }}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: 'rgba(79,70,229,0.12)', color: '#4f46e5' }}
          >
            <Bell size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-bold text-text">
              {t('settings.notification_section_title')}
            </h2>
            <p className="text-[11px] leading-4 text-muted">
              {t('settings.notification_section_desc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-text">
              {t('settings.notification_daily_toggle')}
            </p>
            <p className="text-[11px] leading-4 text-muted">
              {t('settings.notification_daily_toggle_desc')}
            </p>
          </div>
          <ReminderSwitch
            checked={settings?.dataEntryReminderEnabled ?? false}
            disabled={loading || saving}
            label={t('settings.notification_daily_toggle')}
            onChange={(enabled) => void handleGlobalToggle(enabled)}
          />
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className={`rounded-[12px] px-3 py-2.5 ${permissionTone}`}>
            <p className="text-[12px] font-semibold">{permissionLabel}</p>
            {settings?.permissionStatus === 'delayed' && (
              <button
                type="button"
                onClick={() => void openExactAlarmSystemSettings()}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold underline"
              >
                {t('settings.notification_open_alarm_settings')}
                <ExternalLink size={12} />
              </button>
            )}
            {(settings?.permissionStatus === 'disabled' ||
              settings?.permissionStatus === 'required') && (
              <button
                type="button"
                onClick={() => void openNotificationSystemSettings()}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold underline"
              >
                {t('settings.notification_open_system_settings')}
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-border">
          {settings?.reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-16 items-center justify-center rounded-[10px] bg-bg-subtle font-mono text-[15px] font-bold text-text">
                {formatReminderTime(reminder)}
              </div>
              <div className="flex-1" />
              <ReminderSwitch
                checked={reminder.enabled}
                disabled={saving}
                label={`${t('settings.notification_reminder_time')} ${formatReminderTime(reminder)}`}
                onChange={(enabled) => {
                  void apply(
                    () => notificationReminders.setReminderEnabled(reminder.id, enabled),
                    'toggleReminder',
                  );
                }}
              />
              <button
                type="button"
                aria-label={t('common.edit')}
                onClick={() =>
                  setPicker({ reminder, value: formatReminderTime(reminder) })
                }
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-bg-subtle text-muted"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                aria-label={t('common.delete')}
                onClick={() => void deleteReminder(reminder)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-rose-50 text-rose-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {!loading && settings?.reminders.length === 0 && (
          <div className="px-6 py-7 text-center">
            <Clock3 size={28} className="mx-auto text-subtle" />
            <p className="mt-2 text-[13px] font-semibold text-text">
              {t('settings.notification_empty_title')}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {t('settings.notification_empty_desc')}
            </p>
          </div>
        )}

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => void openAddPicker()}
            disabled={loading || saving}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-primary text-[13px] font-semibold text-white disabled:opacity-50"
          >
            <Plus size={17} />
            {t('settings.notification_add_time')}
          </button>
        </div>
      </section>

      <TimePickerSheet
        state={picker}
        duplicate={duplicate}
        saving={saving}
        onChange={(value) =>
          setPicker((current) => (current ? { ...current, value } : current))
        }
        onClose={() => setPicker(null)}
        onSave={() => void savePicker()}
      />
    </>
  );
}
