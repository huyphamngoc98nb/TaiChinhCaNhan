import { getDbConnection } from '@/core/db/sqlite/connection';
import { isManagedTransactionActive } from '@/core/db/sqlite/transaction';
import type {
  AccountType,
  CreateWalletInput,
  IWalletRepository,
  UpdateWalletInput,
  Wallet,
  WalletReferenceCounts,
  UpsertCreditCardStatementInput,
} from './wallet.repository';

export type { AccountType, CreateWalletInput, UpdateWalletInput, Wallet } from './wallet.repository';

const WALLET_COLUMNS = `
  id, name, currency, balance,
  account_type, icon, color, sort_order,
  is_active, exclude_from_total,
  credit_limit, statement_day, due_day, annual_fee,
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
    annual_fee: row.annual_fee == null ? null : Number(row.annual_fee),
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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

  async getActiveCreditCards(): Promise<Wallet[]> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT ${WALLET_COLUMNS}
       FROM wallets
       WHERE is_active = 1
         AND account_type = 'credit_card'
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

  async getCreditCardOutstandingBalance(walletId: string): Promise<number> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT CASE
          WHEN balance < 0 THEN -balance
          ELSE 0
        END AS outstanding_balance
       FROM wallets
       WHERE id = ?
         AND account_type = 'credit_card'
       LIMIT 1`,
      [walletId]
    );
    return Number(values?.[0]?.outstanding_balance ?? 0);
  }

  async getCreditCardStatementBalance(
    walletId: string,
    startDate: number,
    endDate: number
  ): Promise<number> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS statement_balance
       FROM transactions
       WHERE wallet_id = ?
         AND type = 'expense'
         AND deleted_at IS NULL
         AND transaction_date >= ?
         AND transaction_date <= ?`,
      [walletId, startDate, endDate]
    );
    return Number(values?.[0]?.statement_balance ?? 0);
  }

  async getPaidAmountForStatement(
    walletId: string,
    periodStart: number,
    dueAt: number
  ): Promise<number> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT COALESCE(SUM(t.amount), 0) AS paid_amount
       FROM transactions t
       WHERE t.to_wallet_id = ?
         AND t.type = 'transfer'
         AND t.deleted_at IS NULL
         AND t.transaction_date >= ?
         AND t.transaction_date <= ?`,
      [walletId, periodStart, dueAt]
    );
    return Number(values?.[0]?.paid_amount ?? 0);
  }

  async upsertCreditCardStatement(data: UpsertCreditCardStatementInput): Promise<void> {
    const db = await getDbConnection();
    await db.run(
      `INSERT OR REPLACE INTO credit_card_statements
         (id, wallet_id, period_start, period_end, closing_at, due_at,
          statement_balance, paid_amount, remaining_amount, status, created_at, updated_at)
       VALUES (
         COALESCE(
           (SELECT id FROM credit_card_statements
            WHERE wallet_id = ? AND period_start = ? AND period_end = ?),
           ?
         ),
         ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       )`,
      [
        data.wallet_id,
        data.period_start,
        data.period_end,
        generateId(),
        data.wallet_id,
        data.period_start,
        data.period_end,
        data.closing_at,
        data.due_at,
        data.statement_balance,
        data.paid_amount,
        data.remaining_amount,
        data.status,
        data.now,
        data.now,
      ],
      !isManagedTransactionActive()
    );
  }

  async getCreditCardAvailableCredit(walletId: string): Promise<number | null> {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT credit_limit, balance
       FROM wallets
       WHERE id = ?
         AND account_type = 'credit_card'
       LIMIT 1`,
      [walletId]
    );
    const row = values?.[0] as Record<string, unknown> | undefined;
    if (!row || row.credit_limit == null) return null;
    return Number(row.credit_limit) + Math.min(Number(row.balance ?? 0), 0);
  }

  async listUpcomingCreditCardDuePayments(
    asOf: number,
    throughDate: number
  ): Promise<
    {
      wallet_id: string;
      wallet_name: string;
      due_at: number;
      outstanding_balance: number;
      statement_balance: number;
    }[]
  > {
    const db = await getDbConnection();
    const { values } = await db.query(
      `SELECT
         s.wallet_id,
         w.name AS wallet_name,
         s.due_at,
         CASE WHEN w.balance < 0 THEN -w.balance ELSE 0 END AS outstanding_balance,
         s.statement_balance
       FROM credit_card_statements s
       JOIN wallets w ON w.id = s.wallet_id
       WHERE w.is_active = 1
         AND w.account_type = 'credit_card'
         AND s.due_at >= ?
         AND s.due_at <= ?
         AND s.status IN ('open', 'closed', 'partial', 'overdue')
       ORDER BY s.due_at ASC`,
      [asOf, throughDate]
    );
    return (values ?? []).map((row: Record<string, unknown>) => ({
      wallet_id: row.wallet_id as string,
      wallet_name: row.wallet_name as string,
      due_at: Number(row.due_at),
      outstanding_balance: Number(row.outstanding_balance ?? 0),
      statement_balance: Number(row.statement_balance ?? 0),
    }));
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
          credit_limit, statement_day, due_day, annual_fee,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
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
        data.annual_fee ?? null,
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
    if (data.balance       !== undefined) { sets.push('balance = ?');             values.push(data.balance); }
    if (data.account_type  !== undefined) { sets.push('account_type = ?');        values.push(data.account_type); }
    if (data.icon          !== undefined) { sets.push('icon = ?');                values.push(data.icon); }
    if (data.color         !== undefined) { sets.push('color = ?');               values.push(data.color); }
    if (data.sort_order    !== undefined) { sets.push('sort_order = ?');           values.push(data.sort_order); }
    if (data.is_active     !== undefined) { sets.push('is_active = ?');            values.push(data.is_active); }
    if (data.exclude_from_total !== undefined) { sets.push('exclude_from_total = ?'); values.push(data.exclude_from_total); }
    if (data.credit_limit  !== undefined) { sets.push('credit_limit = ?');         values.push(data.credit_limit); }
    if (data.statement_day !== undefined) { sets.push('statement_day = ?');        values.push(data.statement_day); }
    if (data.due_day       !== undefined) { sets.push('due_day = ?');              values.push(data.due_day); }
    if (data.annual_fee    !== undefined) { sets.push('annual_fee = ?');           values.push(data.annual_fee); }

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
