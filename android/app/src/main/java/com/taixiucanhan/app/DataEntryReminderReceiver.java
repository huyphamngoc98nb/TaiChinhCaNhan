package com.taixiucanhan.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

public class DataEntryReminderReceiver extends BroadcastReceiver {
    public static final String CHANNEL_ID = "data_entry_reminders";
    public static final String EXTRA_NOTIFICATION_ROUTE = "notification_route";
    public static final String TRANSACTION_ENTRY_ROUTE = "/transactions/new";
    private static final String TAG = "ReminderReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        NotificationReminderScheduler scheduler = new NotificationReminderScheduler(context);

        if (!NotificationReminderScheduler.ACTION_REMINDER_ALARM.equals(action)) {
            Log.i(TAG, "Rescheduling reminders after system event: " + action);
            scheduler.scheduleAllEnabled();
            return;
        }

        String reminderId = intent.getStringExtra(NotificationReminderScheduler.EXTRA_REMINDER_ID);
        NotificationReminderStore store = new NotificationReminderStore(context);
        NotificationReminderStore.Reminder reminder = store.getReminder(reminderId);

        if (!store.isGlobalEnabled() || reminder == null || !reminder.enabled) {
            if (reminderId != null) scheduler.cancel(reminderId);
            return;
        }

        long now = System.currentTimeMillis();
        if (canPostNotifications(context) && store.markFiredIfNew(reminder.id, now)) {
            createNotificationChannel(context);
            postNotification(context, reminder);
        } else {
            Log.w(TAG, "Reminder notification skipped because permission is blocked or already delivered");
        }

        scheduler.schedule(reminder);
    }

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Nhắc nhập số liệu",
                NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Nhắc bạn cập nhật thu chi và số liệu hằng ngày");
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    public static boolean canPostNotifications(Context context) {
        if (
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                        && ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.POST_NOTIFICATIONS
                        ) != PackageManager.PERMISSION_GRANTED
        ) {
            return false;
        }

        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return false;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager systemManager = context.getSystemService(NotificationManager.class);
            NotificationChannel channel = systemManager == null
                    ? null
                    : systemManager.getNotificationChannel(CHANNEL_ID);
            return channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
        }
        return true;
    }

    private void postNotification(
            Context context,
            NotificationReminderStore.Reminder reminder
    ) {
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.putExtra(EXTRA_NOTIFICATION_ROUTE, TRANSACTION_ENTRY_ROUTE);
        launchIntent.putExtra(NotificationReminderScheduler.EXTRA_REMINDER_ID, reminder.id);
        launchIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );

        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                NotificationReminderScheduler.requestCodeFor(reminder.id),
                launchIntent,
                pendingFlags
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_data_entry_reminder)
                .setContentTitle("Đã đến giờ cập nhật số liệu")
                .setContentText("Hãy ghi lại các khoản thu chi mới để báo cáo luôn chính xác.")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setAutoCancel(true)
                .setContentIntent(contentIntent)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setOnlyAlertOnce(true);

        try {
            NotificationManagerCompat.from(context).notify(
                    NotificationReminderScheduler.notificationIdFor(reminder.id),
                    builder.build()
            );
            Log.i(TAG, "Posted reminder notification " + reminder.id);
        } catch (SecurityException exception) {
            Log.w(TAG, "Notification permission was revoked", exception);
        }
    }
}
