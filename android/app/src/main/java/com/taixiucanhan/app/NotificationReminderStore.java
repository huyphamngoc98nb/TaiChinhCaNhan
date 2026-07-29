package com.taixiucanhan.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;

public final class NotificationReminderStore {
    private static final String PREFERENCES_NAME = "notification_reminders_v1";
    private static final String KEY_GLOBAL_ENABLED = "data_entry_reminder_enabled";
    private static final String KEY_REMINDERS = "reminders";
    private static final String KEY_PENDING_ROUTE = "pending_route";
    private static final String KEY_NOTIFICATION_PERMISSION_REQUESTED =
            "notification_permission_requested";
    private static final String KEY_LAST_FIRED_PREFIX = "last_fired_minute_";

    public static final class Reminder {
        public final String id;
        public final int hour;
        public final int minute;
        public final boolean enabled;
        public final long createdAt;
        public final long updatedAt;

        public Reminder(
                String id,
                int hour,
                int minute,
                boolean enabled,
                long createdAt,
                long updatedAt
        ) {
            this.id = id;
            this.hour = hour;
            this.minute = minute;
            this.enabled = enabled;
            this.createdAt = createdAt;
            this.updatedAt = updatedAt;
        }

        JSONObject toJson() throws JSONException {
            JSONObject json = new JSONObject();
            json.put("id", id);
            json.put("hour", hour);
            json.put("minute", minute);
            json.put("enabled", enabled);
            json.put("createdAt", createdAt);
            json.put("updatedAt", updatedAt);
            return json;
        }

        static Reminder fromJson(JSONObject json) throws JSONException {
            return new Reminder(
                    json.getString("id"),
                    json.getInt("hour"),
                    json.getInt("minute"),
                    json.optBoolean("enabled", true),
                    json.optLong("createdAt", 0L),
                    json.optLong("updatedAt", 0L)
            );
        }
    }

    private final SharedPreferences preferences;

    public NotificationReminderStore(Context context) {
        preferences = context.getApplicationContext().getSharedPreferences(
                PREFERENCES_NAME,
                Context.MODE_PRIVATE
        );
    }

    public synchronized boolean isGlobalEnabled() {
        return preferences.getBoolean(KEY_GLOBAL_ENABLED, false);
    }

    public synchronized void setGlobalEnabled(boolean enabled) {
        preferences.edit().putBoolean(KEY_GLOBAL_ENABLED, enabled).apply();
    }

    public synchronized List<Reminder> getReminders() {
        List<Reminder> reminders = new ArrayList<>();
        String raw = preferences.getString(KEY_REMINDERS, "[]");

        try {
            JSONArray json = new JSONArray(raw);
            for (int index = 0; index < json.length(); index += 1) {
                try {
                    Reminder reminder = Reminder.fromJson(json.getJSONObject(index));
                    if (isValid(reminder)) reminders.add(reminder);
                } catch (JSONException ignored) {
                    // Preserve valid reminders if one stored entry is malformed.
                }
            }
        } catch (JSONException ignored) {
            // Return an empty list instead of crashing a boot or alarm receiver.
        }

        sortByTime(reminders);
        return reminders;
    }

    public synchronized Reminder getReminder(String id) {
        if (id == null) return null;
        for (Reminder reminder : getReminders()) {
            if (id.equals(reminder.id)) return reminder;
        }
        return null;
    }

    public synchronized boolean hasTime(int hour, int minute, String excludingId) {
        for (Reminder reminder : getReminders()) {
            if (excludingId != null && excludingId.equals(reminder.id)) continue;
            if (reminder.hour == hour && reminder.minute == minute) return true;
        }
        return false;
    }

    public synchronized void upsert(Reminder reminder) throws JSONException {
        if (!isValid(reminder)) throw new IllegalArgumentException("Invalid reminder");

        List<Reminder> reminders = getReminders();
        boolean replaced = false;
        for (int index = 0; index < reminders.size(); index += 1) {
            if (reminders.get(index).id.equals(reminder.id)) {
                reminders.set(index, reminder);
                replaced = true;
                break;
            }
        }
        if (!replaced) reminders.add(reminder);
        save(reminders);
    }

    public synchronized boolean delete(String id) throws JSONException {
        List<Reminder> reminders = getReminders();
        boolean removed = false;
        Iterator<Reminder> iterator = reminders.iterator();
        while (iterator.hasNext()) {
            if (iterator.next().id.equals(id)) {
                iterator.remove();
                removed = true;
                break;
            }
        }
        if (removed) {
            save(reminders);
            preferences.edit().remove(KEY_LAST_FIRED_PREFIX + id).apply();
        }
        return removed;
    }

    public synchronized boolean markFiredIfNew(String id, long nowMillis) {
        long minute = nowMillis / 60_000L;
        String key = KEY_LAST_FIRED_PREFIX + id;
        if (preferences.getLong(key, Long.MIN_VALUE) == minute) return false;
        preferences.edit().putLong(key, minute).apply();
        return true;
    }

    public synchronized void setPendingRoute(String route) {
        preferences.edit().putString(KEY_PENDING_ROUTE, route).apply();
    }

    public synchronized String consumePendingRoute() {
        String route = preferences.getString(KEY_PENDING_ROUTE, null);
        if (route != null) preferences.edit().remove(KEY_PENDING_ROUTE).apply();
        return route;
    }

    public synchronized boolean wasNotificationPermissionRequested() {
        return preferences.getBoolean(KEY_NOTIFICATION_PERMISSION_REQUESTED, false);
    }

    public synchronized void markNotificationPermissionRequested() {
        preferences.edit().putBoolean(KEY_NOTIFICATION_PERMISSION_REQUESTED, true).apply();
    }

    private void save(List<Reminder> reminders) throws JSONException {
        JSONArray json = new JSONArray();
        sortByTime(reminders);
        for (Reminder reminder : reminders) json.put(reminder.toJson());
        preferences.edit().putString(KEY_REMINDERS, json.toString()).apply();
    }

    private void sortByTime(List<Reminder> reminders) {
        Collections.sort(reminders, new Comparator<Reminder>() {
            @Override
            public int compare(Reminder left, Reminder right) {
                int hourComparison = Integer.compare(left.hour, right.hour);
                return hourComparison != 0
                        ? hourComparison
                        : Integer.compare(left.minute, right.minute);
            }
        });
    }

    private boolean isValid(Reminder reminder) {
        return reminder != null
                && reminder.id != null
                && !reminder.id.isEmpty()
                && reminder.hour >= 0
                && reminder.hour <= 23
                && reminder.minute >= 0
                && reminder.minute <= 59;
    }
}
