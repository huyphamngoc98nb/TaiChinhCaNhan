package com.taixiucanhan.app;

import java.util.Calendar;

public final class ReminderTimeCalculator {
    private ReminderTimeCalculator() {}

    public static long calculateNextTriggerMillis(Calendar now, int hour, int minute) {
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            throw new IllegalArgumentException("Invalid reminder time");
        }

        Calendar next = (Calendar) now.clone();
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, minute);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);

        if (!next.after(now)) {
            next.add(Calendar.DAY_OF_MONTH, 1);
        }

        return next.getTimeInMillis();
    }
}
