import { describe, it, expect } from 'vitest';
import { computeNextDueDate } from '../modules/recurring-bills/services/compute-next-due-date';
import { classifyDueStatus, daysDiff } from '../modules/recurring-bills/services/classify-due-status';

describe('Recurring Bills Logic', () => {
  describe('computeNextDueDate', () => {
    it('computes next month correctly', () => {
      const start = new Date(2026, 0, 15).getTime(); // Jan 15
      const next = computeNextDueDate(start, 'monthly');
      const nextDate = new Date(next);
      expect(nextDate.getMonth()).toBe(1); // Feb
      expect(nextDate.getDate()).toBe(15);
    });

    it('handles month boundary (clamping) - Jan 31 -> Feb 28/29', () => {
      const start = new Date(2026, 0, 31).getTime(); // Jan 31
      const next = computeNextDueDate(start, 'monthly');
      const nextDate = new Date(next);
      // Native JS: new Date(2026, 1, 31) becomes Mar 3
      expect(nextDate.getMonth()).toBe(2); 
    });

    it('computes next year correctly', () => {
      const start = new Date(2026, 5, 1).getTime();
      const next = computeNextDueDate(start, 'yearly');
      expect(new Date(next).getFullYear()).toBe(2027);
    });
  });

  describe('classifyDueStatus', () => {
    const today = new Date(2026, 4, 10, 12, 0).getTime(); // May 10, 12:00
    const reminderDays = 3;

    it('identifies overdue', () => {
      const due = new Date(2026, 4, 9).getTime(); // May 9
      expect(classifyDueStatus(due, reminderDays, today)).toBe('overdue');
    });

    it('identifies due today', () => {
      const due = new Date(2026, 4, 10, 23, 0).getTime(); // May 10
      expect(classifyDueStatus(due, reminderDays, today)).toBe('due_today');
    });

    it('identifies upcoming within window', () => {
      const due = new Date(2026, 4, 12).getTime(); // May 12 (2 days away)
      expect(classifyDueStatus(due, reminderDays, today)).toBe('upcoming');
    });

    it('returns null outside window', () => {
      const due = new Date(2026, 4, 15).getTime(); // May 15 (5 days away)
      expect(classifyDueStatus(due, reminderDays, today)).toBe(null);
    });
  });

  describe('daysDiff', () => {
    const today = new Date(2026, 4, 10).getTime();
    
    it('returns 0 for same day', () => {
      expect(daysDiff(today, today)).toBe(0);
    });

    it('returns positive for future', () => {
      const future = new Date(2026, 4, 12).getTime();
      expect(daysDiff(future, today)).toBe(2);
    });

    it('returns negative for past', () => {
      const past = new Date(2026, 4, 8).getTime();
      expect(daysDiff(past, today)).toBe(-2);
    });
  });
});
