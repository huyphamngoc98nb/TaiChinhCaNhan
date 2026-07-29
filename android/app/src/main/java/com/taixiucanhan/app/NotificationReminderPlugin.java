package com.taixiucanhan.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;

import java.util.UUID;

@CapacitorPlugin(
        name = "NotificationReminders",
        permissions = {
                @Permission(
                        strings = { Manifest.permission.POST_NOTIFICATIONS },
                        alias = "notifications"
                )
        }
)
public class NotificationReminderPlugin extends Plugin {
    private static final String TAG = "ReminderPlugin";
    private NotificationReminderStore store;
    private NotificationReminderScheduler scheduler;

    @Override
    public void load() {
        store = new NotificationReminderStore(getContext());
        scheduler = new NotificationReminderScheduler(getContext());
        DataEntryReminderReceiver.createNotificationChannel(getContext());
        captureNotificationRoute(getActivity().getIntent(), false);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        captureNotificationRoute(intent, true);
    }

    @PluginMethod
    public void getSettings(PluginCall call) {
        call.resolve(buildSettingsResponse());
    }

    @PluginMethod
    public void setGlobalEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("Missing enabled value", "INVALID_INPUT");
            return;
        }

        store.setGlobalEnabled(enabled);
        if (enabled) scheduler.scheduleAllEnabled();
        else scheduler.cancelAll();
        Log.i(TAG, "Global reminders " + (enabled ? "enabled" : "disabled"));
        call.resolve(buildSettingsResponse());
    }

    @PluginMethod
    public void addReminder(PluginCall call) {
        Integer hour = call.getInt("hour");
        Integer minute = call.getInt("minute");
        if (!isValidTime(hour, minute)) {
            call.reject("Invalid reminder time", "INVALID_TIME");
            return;
        }
        if (store.hasTime(hour, minute, null)) {
            call.reject("Reminder time already exists", "DUPLICATE_TIME");
            return;
        }

        long now = System.currentTimeMillis();
        NotificationReminderStore.Reminder reminder = new NotificationReminderStore.Reminder(
                UUID.randomUUID().toString(),
                hour,
                minute,
                true,
                now,
                now
        );
        try {
            store.upsert(reminder);
            scheduler.schedule(reminder);
            Log.i(TAG, "Added reminder " + reminder.id);
            call.resolve(buildSettingsResponse());
        } catch (JSONException exception) {
            call.reject("Unable to save reminder", "SAVE_FAILED", exception);
        }
    }

    @PluginMethod
    public void updateReminder(PluginCall call) {
        String id = call.getString("id");
        Integer hour = call.getInt("hour");
        Integer minute = call.getInt("minute");
        NotificationReminderStore.Reminder current = store.getReminder(id);
        if (current == null) {
            call.reject("Reminder not found", "NOT_FOUND");
            return;
        }
        if (!isValidTime(hour, minute)) {
            call.reject("Invalid reminder time", "INVALID_TIME");
            return;
        }
        if (store.hasTime(hour, minute, id)) {
            call.reject("Reminder time already exists", "DUPLICATE_TIME");
            return;
        }

        NotificationReminderStore.Reminder updated = new NotificationReminderStore.Reminder(
                current.id,
                hour,
                minute,
                current.enabled,
                current.createdAt,
                System.currentTimeMillis()
        );
        try {
            scheduler.cancel(current.id);
            store.upsert(updated);
            scheduler.schedule(updated);
            Log.i(TAG, "Updated reminder " + updated.id);
            call.resolve(buildSettingsResponse());
        } catch (JSONException exception) {
            call.reject("Unable to update reminder", "SAVE_FAILED", exception);
        }
    }

    @PluginMethod
    public void setReminderEnabled(PluginCall call) {
        String id = call.getString("id");
        Boolean enabled = call.getBoolean("enabled");
        NotificationReminderStore.Reminder current = store.getReminder(id);
        if (current == null) {
            call.reject("Reminder not found", "NOT_FOUND");
            return;
        }
        if (enabled == null) {
            call.reject("Missing enabled value", "INVALID_INPUT");
            return;
        }

        NotificationReminderStore.Reminder updated = new NotificationReminderStore.Reminder(
                current.id,
                current.hour,
                current.minute,
                enabled,
                current.createdAt,
                System.currentTimeMillis()
        );
        try {
            store.upsert(updated);
            if (enabled) scheduler.schedule(updated);
            else scheduler.cancel(updated.id);
            Log.i(TAG, "Reminder " + updated.id + " enabled=" + enabled);
            call.resolve(buildSettingsResponse());
        } catch (JSONException exception) {
            call.reject("Unable to update reminder", "SAVE_FAILED", exception);
        }
    }

    @PluginMethod
    public void deleteReminder(PluginCall call) {
        String id = call.getString("id");
        if (id == null || store.getReminder(id) == null) {
            call.reject("Reminder not found", "NOT_FOUND");
            return;
        }

        try {
            scheduler.cancel(id);
            store.delete(id);
            Log.i(TAG, "Deleted reminder " + id);
            call.resolve(buildSettingsResponse());
        } catch (JSONException exception) {
            call.reject("Unable to delete reminder", "SAVE_FAILED", exception);
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve(buildSettingsResponse());
            return;
        }
        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(buildSettingsResponse());
            return;
        }
        if (store.wasNotificationPermissionRequested()) {
            call.resolve(buildSettingsResponse());
            return;
        }
        store.markNotificationPermissionRequested();
        requestPermissionForAlias(
                "notifications",
                call,
                "notificationPermissionCallback"
        );
    }

    @PermissionCallback
    public void notificationPermissionCallback(PluginCall call) {
        if (store.isGlobalEnabled()) scheduler.scheduleAllEnabled();
        call.resolve(buildSettingsResponse());
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            getActivity().startActivity(intent);
            call.resolve();
        } catch (RuntimeException exception) {
            call.reject("Unable to open notification settings", "OPEN_SETTINGS_FAILED", exception);
        }
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            call.resolve();
            return;
        }

        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (RuntimeException exception) {
            call.reject("Unable to open alarms and reminders settings", "OPEN_SETTINGS_FAILED", exception);
        }
    }

    @PluginMethod
    public void consumePendingRoute(PluginCall call) {
        String route = store.consumePendingRoute();
        JSObject response = new JSObject();
        response.put("route", route);
        call.resolve(response);
    }

    private JSObject buildSettingsResponse() {
        boolean exactAlarmAllowed = scheduler.canScheduleExactAlarms();
        boolean runtimePermissionGranted = isRuntimePermissionGranted();
        boolean appNotificationsEnabled =
                NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        boolean channelEnabled = isChannelEnabled();
        String permissionStatus;

        if (!runtimePermissionGranted) permissionStatus = "required";
        else if (!appNotificationsEnabled || !channelEnabled) permissionStatus = "disabled";
        else if (store.isGlobalEnabled() && !exactAlarmAllowed) permissionStatus = "delayed";
        else permissionStatus = "granted";

        JSArray reminders = new JSArray();
        for (NotificationReminderStore.Reminder reminder : store.getReminders()) {
            try {
                reminders.put(reminder.toJson());
            } catch (JSONException ignored) {
                // Invalid items are already filtered by the store.
            }
        }

        JSObject response = new JSObject();
        response.put("dataEntryReminderEnabled", store.isGlobalEnabled());
        response.put("reminders", reminders);
        response.put("permissionStatus", permissionStatus);
        response.put("exactAlarmAllowed", exactAlarmAllowed);
        response.put(
                "notificationPermissionRequested",
                store.wasNotificationPermissionRequested()
        );
        return response;
    }

    private boolean isRuntimePermissionGranted() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                || ContextCompat.checkSelfPermission(
                        getContext(),
                        Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isChannelEnabled() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        NotificationChannel channel = manager == null
                ? null
                : manager.getNotificationChannel(DataEntryReminderReceiver.CHANNEL_ID);
        return channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
    }

    private boolean isValidTime(Integer hour, Integer minute) {
        return hour != null
                && minute != null
                && hour >= 0
                && hour <= 23
                && minute >= 0
                && minute <= 59;
    }

    private void captureNotificationRoute(Intent intent, boolean notify) {
        if (intent == null) return;
        String route = intent.getStringExtra(DataEntryReminderReceiver.EXTRA_NOTIFICATION_ROUTE);
        if (!DataEntryReminderReceiver.TRANSACTION_ENTRY_ROUTE.equals(route)) return;

        store.setPendingRoute(route);
        intent.removeExtra(DataEntryReminderReceiver.EXTRA_NOTIFICATION_ROUTE);
        if (notify) {
            JSObject data = new JSObject();
            data.put("route", route);
            notifyListeners("notificationRoute", data, true);
        }
    }
}
