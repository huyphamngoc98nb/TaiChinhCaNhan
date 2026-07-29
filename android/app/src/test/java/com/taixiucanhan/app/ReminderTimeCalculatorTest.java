package com.taixiucanhan.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.util.Calendar;
import java.util.TimeZone;

public class ReminderTimeCalculatorTest {
    private Calendar at(int year, int month, int day, int hour, int minute) {
        Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        calendar.clear();
        calendar.set(year, month, day, hour, minute, 0);
        return calendar;
    }

    @Test
    public void schedulesLaterTimeToday() {
        Calendar now = at(2026, Calendar.JULY, 29, 8, 0);
        Calendar expected = at(2026, Calendar.JULY, 29, 12, 30);
        assertEquals(
                expected.getTimeInMillis(),
                ReminderTimeCalculator.calculateNextTriggerMillis(now, 12, 30)
        );
    }

    @Test
    public void schedulesPastTimeTomorrow() {
        Calendar now = at(2026, Calendar.JULY, 29, 20, 0);
        Calendar expected = at(2026, Calendar.JULY, 30, 8, 0);
        assertEquals(
                expected.getTimeInMillis(),
                ReminderTimeCalculator.calculateNextTriggerMillis(now, 8, 0)
        );
    }

    @Test
    public void handlesMidnightAndEndOfDay() {
        Calendar midday = at(2026, Calendar.JULY, 29, 12, 0);
        Calendar nextMidnight = at(2026, Calendar.JULY, 30, 0, 0);
        assertEquals(
                nextMidnight.getTimeInMillis(),
                ReminderTimeCalculator.calculateNextTriggerMillis(midday, 0, 0)
        );

        Calendar expectedEndOfDay = at(2026, Calendar.JULY, 29, 23, 59);
        assertEquals(
                expectedEndOfDay.getTimeInMillis(),
                ReminderTimeCalculator.calculateNextTriggerMillis(midday, 23, 59)
        );
    }

    @Test
    public void sameMinuteMovesToNextDay() {
        Calendar now = at(2026, Calendar.JULY, 29, 8, 0);
        Calendar expected = at(2026, Calendar.JULY, 30, 8, 0);
        assertEquals(
                expected.getTimeInMillis(),
                ReminderTimeCalculator.calculateNextTriggerMillis(now, 8, 0)
        );
    }
}
