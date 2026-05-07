-- Migration 006: Add reminder_days column to recurring_bills
-- Existing rows default to 3 days before due date.
ALTER TABLE recurring_bills ADD COLUMN reminder_days INTEGER NOT NULL DEFAULT 3;
