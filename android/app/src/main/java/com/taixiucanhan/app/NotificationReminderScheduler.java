package com.taixiucanhan.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import java.util.Calendar;

public final class NotificationReminderScheduler {
    public static final String ACTION_REMINDER_ALARM =
            "com.taixiucanhan.app.action.DATA_ENTRY_REMINDER";
    public static final String EXTRA_REMINDER_ID = "reminder_id";
    private static final String TAG = "ReminderScheduler";
    private static final int REQUEST_CODE_NAMESPACE = 0x24000000;

    private final Context context;
    private final NotificationReminderStore store;
    private final AlarmManager alarmManager;

    public NotificationReminderScheduler(Context context) {
        this.context = context.getApplicationContext();
        this.store = new NotificationReminderStore(this.context);
        this.alarmManager = (AlarmManager) this.context.getSystemService(Context.ALARM_SERVICE);
    }

    public boolean schedule(NotificationReminderStore.Reminder reminder) {
        if (!store.isGlobalEnabled() || reminder == null || !reminder.enabled) {
            if (reminder != null) cancel(reminder.id);
            return false;
        }

        long triggerAt = ReminderTimeCalculator.calculateNextTriggerMillis(
                Calendar.getInstance(),
                reminder.hour,
                reminder.minute
        );
        PendingIntent pendingIntent = alarmPendingIntent(reminder.id, PendingIntent.FLAG_UPDATE_CURRENT);

        try {
            if (canScheduleExactAlarms()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            triggerAt,
                            pendingIntent
                    );
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                }
                Log.i(TAG, "Scheduled exact reminder " + reminder.id);
                return true;
            }
        } catch (SecurityException exception) {
            Log.w(TAG, "Exact alarm permission unavailable; using fallback", exception);
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                );
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            }
            Log.i(TAG, "Scheduled inexact reminder " + reminder.id);
            return false;
        } catch (RuntimeException exception) {
            Log.e(TAG, "Failed to schedule reminder " + reminder.id, exception);
            return false;
        }
    }

    public void cancel(String reminderId) {
        if (reminderId == null || reminderId.isEmpty()) return;
        PendingIntent pendingIntent = alarmPendingIntent(
                reminderId,
                PendingIntent.FLAG_NO_CREATE
        );
        if (pendingIntent == null) return;

        try {
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            Log.i(TAG, "Canceled reminder " + reminderId);
        } catch (RuntimeException exception) {
            Log.w(TAG, "Failed to cancel reminder " + reminderId, exception);
        }
    }

    public void scheduleAllEnabled() {
        if (!store.isGlobalEnabled()) {
            cancelAll();
            return;
        }
        for (NotificationReminderStore.Reminder reminder : store.getReminders()) {
            if (reminder.enabled) schedule(reminder);
            else cancel(reminder.id);
        }
    }

    public void cancelAll() {
        for (NotificationReminderStore.Reminder reminder : store.getReminders()) {
            cancel(reminder.id);
        }
    }

    public boolean canScheduleExactAlarms() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S
                || alarmManager.canScheduleExactAlarms();
    }

    public static int requestCodeFor(String reminderId) {
        return REQUEST_CODE_NAMESPACE | (reminderId.hashCode() & 0x00ffffff);
    }

    public static int notificationIdFor(String reminderId) {
        return 0x34000000 | (reminderId.hashCode() & 0x00ffffff);
    }

    private PendingIntent alarmPendingIntent(String reminderId, int baseFlags) {
        Intent intent = new Intent(context, DataEntryReminderReceiver.class);
        intent.setAction(ACTION_REMINDER_ALARM);
        intent.putExtra(EXTRA_REMINDER_ID, reminderId);

        int flags = baseFlags;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(
                context,
                requestCodeFor(reminderId),
                intent,
                flags
        );
    }
}
