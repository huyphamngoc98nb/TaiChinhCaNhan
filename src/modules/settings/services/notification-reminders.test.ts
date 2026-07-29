import { describe, expect, it } from 'vitest';
import {
  formatReminderTime,
  hasDuplicateReminderTime,
  sortNotificationReminders,
  type NotificationReminder,
} from './notification-reminders';

function reminder(
  id: string,
  hour: number,
  minute: number,
  enabled = true,
): NotificationReminder {
  return { id, hour, minute, enabled, createdAt: 1, updatedAt: 1 };
}

describe('notification reminder domain helpers', () => {
  it('sorts multiple reminders by time without mutating the source list', () => {
    const source = [
      reminder('night', 20, 0),
      reminder('morning', 8, 0),
      reminder('noon', 12, 30),
    ];

    expect(sortNotificationReminders(source).map(formatReminderTime)).toEqual([
      '08:00',
      '12:30',
      '20:00',
    ]);
    expect(source.map((item) => item.id)).toEqual(['night', 'morning', 'noon']);
  });

  it('formats midnight and end-of-day using 24-hour time', () => {
    expect(formatReminderTime(reminder('midnight', 0, 0))).toBe('00:00');
    expect(formatReminderTime(reminder('end', 23, 59))).toBe('23:59');
  });

  it('detects duplicate hour and minute while allowing an edited item to keep its time', () => {
    const reminders = [reminder('one', 8, 15), reminder('two', 20, 30)];

    expect(hasDuplicateReminderTime(reminders, 8, 15)).toBe(true);
    expect(hasDuplicateReminderTime(reminders, 8, 15, 'one')).toBe(false);
    expect(hasDuplicateReminderTime(reminders, 8, 16)).toBe(false);
  });
});
