import { getDbConnection } from '@/core/db/sqlite/connection';
import { isManagedTransactionActive } from '@/core/db/sqlite/transaction';
import type {
  AccountType,
  CreateWalletInput,
  IWalletRepository,
  UpdateWalletInput,
  Wallet,
  WalletReferenceCounts,
} from './wallet.repository';

export type { AccountType, CreateWalletInput, UpdateWalletInput, Wallet } from './wallet.repository';

const WALLET_COLUMNS = `
  id, name, currency, balance,
  account_type, icon, color, sort_order,
  is_active, exclude_from_total,
  credit_limit, statement_day, due_day,
  created_at, updated_at
`;

function mapWallet(row: Record<string, unknown>): Wallet {
  const balance = Number(row.balance ?? 0);
  const creditLimit = row.credit_limit == null ? null : Number(row.credit_limit);

  return {
    id: row.id as string,
    name: row.name as string,
    currency: row.currency as string,
    balance: Number.isFinite(balance) ? balance : 0,
    account_type: (row.account_type as AccountType) ?? 'cash',
    icon: (row.icon as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    sort_order: (row.sort_order as number) ?? 0,
    is_active: (row.is_active as 0 | 1) ?? 1,
    exclude_from_total: (row.exclude_from_total as 0 | 1) ?? 0,
    credit_limit: creditLimit != null && Number.isFinite(creditLimit) ? creditLimit : null,
    statement_day: (row.statement_day as number | null) ?? null,
    due_day: (row.due_day as number | null) ?? null,
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

export class SQLiteWalletRepository implements IWalletRepository {
  async getById(id: string): Promise<Wallet | null> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT ${WALLET_COLUMNS} FROM wallets WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!values || values.length === 0) return null;
    return mapWallet(values[0] as Record<string, unknown>);
  }

  /** Returns wallets ordered by sort_order. */
  async getAllActive(): Promise<Wallet[]> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT ${WALLET_COLUMNS}
       FROM wallets
       WHERE is_active = 1
       ORDER BY sort_order ASC, created_at ASC`
    );
    return (values ?? []).map((row) => mapWallet(row as Record<string, unknown>));
  }

  /**
   * Sum of balances for wallets that are not excluded from total.
   * Credit-card wallets hold negative balances (amount owed), so they correctly
   * reduce net worth when summed.
   */
  async getTotalBalance(): Promise<number> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT COALESCE(SUM(balance), 0) AS total
       FROM wallets
       WHERE exclude_from_total = 0`
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
      ],
      !isManagedTransactionActive()
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

    await db.run(`UPDATE wallets SET ${sets.join(', ')} WHERE id = ?`, values, !isManagedTransactionActive());
  }

  async getReferenceCounts(id: string): Promise<WalletReferenceCounts> {
    const db = await getDbConnection();
    const transactions = await db.query(
      `SELECT COUNT(*) AS count
       FROM transactions
       WHERE deleted_at IS NULL
         AND (wallet_id = ? OR to_wallet_id = ?)`,
      [id, id]
    );
    const recurringBills = await db.query(
      'SELECT COUNT(*) AS count FROM recurring_bills WHERE wallet_id = ? AND is_active != -1',
      [id]
    );
    const budgets = await db.query(
      'SELECT COUNT(*) AS count FROM budgets WHERE wallet_id = ? AND is_active = 1',
      [id]
    );

    return {
      transactions: Number(transactions.values?.[0]?.count ?? 0),
      recurringBills: Number(recurringBills.values?.[0]?.count ?? 0),
      budgets: Number(budgets.values?.[0]?.count ?? 0),
    };
  }

  async delete(id: string): Promise<void> {
    const db = await getDbConnection();
    await db.run('DELETE FROM wallets WHERE id = ?', [id], !isManagedTransactionActive());
  }

  /**
   * @deprecated Use updateBalanceDelta() for all transaction-driven adjustments.
   * Only valid for the initial balance set at wallet creation time.
   */
  async updateBalance(id: string, newBalance: number, updatedAt: number): Promise<void> {
    const db = await getDbConnection();
    await db.run(
      'UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?',
      [newBalance, updatedAt, id],
      !isManagedTransactionActive()
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
      [delta, updatedAt, id],
      !isManagedTransactionActive()
    );
  }
}
