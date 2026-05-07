import { getDbConnection } from '@/core/db/sqlite/connection';
import { IRecurringBillRepository } from './recurring-bill.repository';
import {
  RecurringBill,
  CreateRecurringBillInput,
  UpdateRecurringBillInput,
} from '../domain/recurring-bill.model';

function mapRow(row: any): RecurringBill {
  return {
    id: row.id,
    wallet_id: row.wallet_id,
    category_id: row.category_id,
    name: row.name,
    amount: row.amount,
    frequency: row.frequency,
    next_due_date: row.next_due_date,
    reminder_days: row.reminder_days ?? 3,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class SQLiteRecurringBillRepository implements IRecurringBillRepository {
  async create(input: CreateRecurringBillInput): Promise<RecurringBill> {
    const db = await getDbConnection();
    const id = `rb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    await db.run(
      `INSERT INTO recurring_bills
        (id, wallet_id, category_id, name, amount, frequency, next_due_date, reminder_days, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        input.wallet_id,
        input.category_id,
        input.name,
        input.amount,
        input.frequency,
        input.next_due_date,
        input.reminder_days,
        now,
        now,
      ]
    );
    const bill = await this.getById(id);
    return bill!;
  }

  async getById(id: string): Promise<RecurringBill | null> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT * FROM recurring_bills WHERE id = ? AND is_active != -1`,
      [id]
    );
    if (!values || values.length === 0) return null;
    return mapRow(values[0]);
  }

  async listAll(): Promise<RecurringBill[]> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT * FROM recurring_bills WHERE is_active != -1 ORDER BY next_due_date ASC`
    );
    return (values || []).map(mapRow);
  }

  async listActive(): Promise<RecurringBill[]> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT * FROM recurring_bills WHERE is_active = 1 ORDER BY next_due_date ASC`
    );
    return (values || []).map(mapRow);
  }

  async update(id: string, input: UpdateRecurringBillInput): Promise<RecurringBill | null> {
    const db = await getDbConnection();
    const fields: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined)           { fields.push('name = ?');           values.push(input.name); }
    if (input.amount !== undefined)         { fields.push('amount = ?');         values.push(input.amount); }
    if (input.wallet_id !== undefined)      { fields.push('wallet_id = ?');      values.push(input.wallet_id); }
    if (input.category_id !== undefined)    { fields.push('category_id = ?');    values.push(input.category_id); }
    if (input.frequency !== undefined)      { fields.push('frequency = ?');      values.push(input.frequency); }
    if (input.next_due_date !== undefined)  { fields.push('next_due_date = ?');  values.push(input.next_due_date); }
    if (input.reminder_days !== undefined)  { fields.push('reminder_days = ?');  values.push(input.reminder_days); }
    if (input.is_active !== undefined)      { fields.push('is_active = ?');      values.push(input.is_active); }

    if (fields.length === 0) return this.getById(id);

    fields.push('updated_at = ?');
    values.push(Date.now(), id);

    await db.run(
      `UPDATE recurring_bills SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return this.getById(id);
  }

  /**
   * Soft delete: sets is_active = -1 (sentinel value distinct from 0 = paused).
   */
  async softDelete(id: string): Promise<void> {
    const db = await getDbConnection();
    await db.run(
      `UPDATE recurring_bills SET is_active = -1, updated_at = ? WHERE id = ?`,
      [Date.now(), id]
    );
  }

  /**
   * Returns all ACTIVE bills where reminder window is open.
   * Reminder window: next_due_date <= (currentDate + reminder_days * 86400000)
   * This covers overdue, due today, and upcoming within reminder_days.
   */
  async listDueReminders(currentDate: number): Promise<RecurringBill[]> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT * FROM recurring_bills
       WHERE is_active = 1
         AND next_due_date <= (? + (reminder_days * 86400000))
       ORDER BY next_due_date ASC`,
      [currentDate]
    );
    return (values || []).map(mapRow);
  }
}
