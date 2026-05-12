import { getDbConnection } from '@/core/db/sqlite/connection';

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'investment' | 'other';

export interface Wallet {
  id: string;
  name: string;
  currency: string;
  balance: number;
  account_type: AccountType;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: 0 | 1;
  exclude_from_total: 0 | 1;
  credit_limit: number | null;
  statement_day: number | null;
  due_day: number | null;
  created_at: number;
  updated_at: number;
}

export interface CreateWalletInput {
  name: string;
  currency: string;
  balance: number;
  account_type: AccountType;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
  exclude_from_total?: 0 | 1;
  credit_limit?: number | null;
  statement_day?: number | null;
  due_day?: number | null;
}

export interface UpdateWalletInput {
  name?: string;
  currency?: string;
  account_type?: AccountType;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
  is_active?: 0 | 1;
  exclude_from_total?: 0 | 1;
  credit_limit?: number | null;
  statement_day?: number | null;
  due_day?: number | null;
}

const WALLET_COLUMNS = `
  id, name, currency, balance,
  account_type, icon, color, sort_order,
  is_active, exclude_from_total,
  credit_limit, statement_day, due_day,
  created_at, updated_at
`;

function mapWallet(row: Record<string, unknown>): Wallet {
  return {
    id: row.id as string,
    name: row.name as string,
    currency: row.currency as string,
    balance: row.balance as number,
    account_type: (row.account_type as AccountType) ?? 'cash',
    icon: (row.icon as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    sort_order: (row.sort_order as number) ?? 0,
    is_active: (row.is_active as 0 | 1) ?? 1,
    exclude_from_total: (row.exclude_from_total as 0 | 1) ?? 0,
    credit_limit: (row.credit_limit as number | null) ?? null,
    statement_day: (row.statement_day as number | null) ?? null,
    due_day: (row.due_day as number | null) ?? null,
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

export class SQLiteWalletRepository {
  async getById(id: string): Promise<Wallet | null> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT ${WALLET_COLUMNS} FROM wallets WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!values || values.length === 0) return null;
    return mapWallet(values[0] as Record<string, unknown>);
  }

  /** Returns all active wallets ordered by sort_order. */
  async getAllActive(): Promise<Wallet[]> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT ${WALLET_COLUMNS} FROM wallets WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC`
    );
    return (values ?? []).map((row) => mapWallet(row as Record<string, unknown>));
  }

  /**
   * Sum of balances for wallets that are active AND not excluded from total.
   * Credit-card wallets hold negative balances (amount owed), so they correctly
   * reduce net worth when summed.
   */
  async getTotalBalance(): Promise<number> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT COALESCE(SUM(balance), 0) AS total
       FROM wallets
       WHERE is_active = 1 AND exclude_from_total = 0`
    );
    return (values?.[0]?.total as number) ?? 0;
  }

  async create(
    id: string,
    data: CreateWalletInput,
    now: number
  ): Promise<void> {
    const db = await getDbConnection();
    await db.run(
      `INSERT INTO wallets
         (id, name, currency, balance, account_type, icon, color,
          sort_order, is_active, exclude_from_total,
          credit_limit, statement_day, due_day,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.currency,
        data.balance,
        data.account_type,
        data.icon ?? null,
        data.color ?? null,
        data.sort_order ?? 0,
        data.exclude_from_total ?? 0,
        data.credit_limit ?? null,
        data.statement_day ?? null,
        data.due_day ?? null,
        now,
        now,
      ]
    );
  }

  async update(id: string, data: UpdateWalletInput, now: number): Promise<void> {
    const db = await getDbConnection();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.name          !== undefined) { sets.push('name = ?');               values.push(data.name); }
    if (data.currency      !== undefined) { sets.push('currency = ?');            values.push(data.currency); }
    if (data.account_type  !== undefined) { sets.push('account_type = ?');        values.push(data.account_type); }
    if (data.icon          !== undefined) { sets.push('icon = ?');                values.push(data.icon); }
    if (data.color         !== undefined) { sets.push('color = ?');               values.push(data.color); }
    if (data.sort_order    !== undefined) { sets.push('sort_order = ?');           values.push(data.sort_order); }
    if (data.is_active     !== undefined) { sets.push('is_active = ?');            values.push(data.is_active); }
    if (data.exclude_from_total !== undefined) { sets.push('exclude_from_total = ?'); values.push(data.exclude_from_total); }
    if (data.credit_limit  !== undefined) { sets.push('credit_limit = ?');         values.push(data.credit_limit); }
    if (data.statement_day !== undefined) { sets.push('statement_day = ?');        values.push(data.statement_day); }
    if (data.due_day       !== undefined) { sets.push('due_day = ?');              values.push(data.due_day); }

    if (sets.length === 0) return;

    sets.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.run(`UPDATE wallets SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  /** Soft-deactivate: sets is_active = 0. Row is never hard-deleted. */
  async archive(id: string, now: number): Promise<void> {
    const db = await getDbConnection();
    await db.run(
      'UPDATE wallets SET is_active = 0, updated_at = ? WHERE id = ?',
      [now, id]
    );
  }

  /**
   * @deprecated Use updateBalanceDelta() for all transaction-driven adjustments.
   * Only valid for the initial balance set at wallet creation time.
   */
  async updateBalance(id: string, newBalance: number, updatedAt: number): Promise<void> {
    const db = await getDbConnection();
    await db.run(
      'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?',
      [newBalance, updatedAt, id]
    );
  }

  /**
   * Atomic balance delta — safe against race conditions.
   * Uses a single SQL statement so concurrent calls cannot interleave.
   */
  async updateBalanceDelta(id: string, delta: number, updatedAt: number): Promise<void> {
    const db = await getDbConnection();
    await db.run(
      'UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ?',
      [delta, updatedAt, id]
    );
  }
}
