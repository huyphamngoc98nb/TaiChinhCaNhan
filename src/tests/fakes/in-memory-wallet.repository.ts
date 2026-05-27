import type {
  CreateWalletInput,
  IWalletRepository,
  UpsertCreditCardStatementInput,
  UpdateWalletInput,
  Wallet,
} from '@/modules/wallets/repositories/wallet.repository';

interface StoredStatement extends UpsertCreditCardStatementInput {
  id: string;
  created_at: number;
  updated_at: number;
}

export class InMemoryWalletRepository implements IWalletRepository {
  private wallets = new Map<string, Wallet>();
  private statementBalances = new Map<string, number>();
  private paidAmounts = new Map<string, number>();
  private statements = new Map<string, StoredStatement>();

  constructor(initialWallets: Wallet[] = []) {
    initialWallets.forEach((wallet) => {
      this.wallets.set(wallet.id, { ...wallet });
    });
  }

  async getById(id: string): Promise<Wallet | null> {
    const wallet = this.wallets.get(id);
    return wallet ? { ...wallet } : null;
  }

  async getAllActive(): Promise<Wallet[]> {
    return Array.from(this.wallets.values())
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at)
      .map((wallet) => ({ ...wallet }));
  }

  async getActiveCreditCards(): Promise<Wallet[]> {
    return Array.from(this.wallets.values())
      .filter((wallet) => wallet.is_active === 1 && wallet.account_type === 'credit_card')
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at - b.created_at)
      .map((wallet) => ({ ...wallet }));
  }

  async getTotalBalance(): Promise<number> {
    return Array.from(this.wallets.values())
      .filter((wallet) => wallet.exclude_from_total === 0)
      .reduce((total, wallet) => total + wallet.balance, 0);
  }

  async getCreditCardOutstandingBalance(walletId: string): Promise<number> {
    const wallet = this.wallets.get(walletId);
    if (!wallet || wallet.account_type !== 'credit_card') return 0;
    return Math.max(0, -wallet.balance);
  }

  setCreditCardStatementBalance(
    walletId: string,
    startDate: number,
    endDate: number,
    amount: number
  ): void {
    this.statementBalances.set(`${walletId}:${startDate}:${endDate}`, amount);
  }

  setPaidAmountForStatement(walletId: string, periodStart: number, dueAt: number, amount: number): void {
    this.paidAmounts.set(`${walletId}:${periodStart}:${dueAt}`, amount);
  }

  getStatement(
    walletId: string,
    periodStart: number,
    periodEnd: number
  ): StoredStatement | undefined {
    const statement = this.statements.get(`${walletId}:${periodStart}:${periodEnd}`);
    return statement ? { ...statement } : undefined;
  }

  async getCreditCardStatementBalance(
    walletId: string,
    startDate: number,
    endDate: number
  ): Promise<number> {
    return this.statementBalances.get(`${walletId}:${startDate}:${endDate}`) ?? 0;
  }

  async getPaidAmountForStatement(
    walletId: string,
    periodStart: number,
    dueAt: number
  ): Promise<number> {
    return this.paidAmounts.get(`${walletId}:${periodStart}:${dueAt}`) ?? 0;
  }

  async upsertCreditCardStatement(data: UpsertCreditCardStatementInput): Promise<void> {
    const key = `${data.wallet_id}:${data.period_start}:${data.period_end}`;
    const existing = this.statements.get(key);
    this.statements.set(key, {
      ...data,
      id: existing?.id ?? `statement-${this.statements.size + 1}`,
      created_at: existing?.created_at ?? data.now,
      updated_at: data.now,
    });
  }

  async getCreditCardAvailableCredit(walletId: string): Promise<number | null> {
    const wallet = this.wallets.get(walletId);
    if (!wallet || wallet.account_type !== 'credit_card' || wallet.credit_limit == null) {
      return null;
    }
    return wallet.credit_limit + Math.min(wallet.balance, 0);
  }

  async listUpcomingCreditCardDuePayments(): Promise<
    {
      wallet_id: string;
      wallet_name: string;
      due_at: number;
      outstanding_balance: number;
      statement_balance: number;
    }[]
  > {
    return [];
  }

  async create(id: string, data: CreateWalletInput, now: number): Promise<void> {
    this.wallets.set(id, {
      id,
      name: data.name,
      currency: data.currency,
      balance: data.balance,
      account_type: data.account_type,
      icon: data.icon ?? null,
      color: data.color ?? null,
      sort_order: data.sort_order ?? 0,
      is_active: 1,
      exclude_from_total: data.exclude_from_total ?? 0,
      credit_limit: data.credit_limit ?? null,
      statement_day: data.statement_day ?? null,
      due_day: data.due_day ?? null,
      annual_fee: data.annual_fee ?? null,
      created_at: now,
      updated_at: now,
    });
  }

  async update(id: string, data: UpdateWalletInput, now: number): Promise<void> {
    const wallet = this.wallets.get(id);
    if (!wallet) return;

    this.wallets.set(id, {
      ...wallet,
      ...data,
      balance: data.balance ?? wallet.balance,
      updated_at: now,
    });
  }

  async getReferenceCounts(): Promise<{ transactions: number; recurringBills: number; budgets: number }> {
    return { transactions: 0, recurringBills: 0, budgets: 0 };
  }

  async delete(id: string): Promise<void> {
    this.wallets.delete(id);
  }

  async updateBalance(id: string, newBalance: number, updatedAt: number): Promise<void> {
    const wallet = this.wallets.get(id);
    if (wallet) {
      this.wallets.set(id, { ...wallet, balance: newBalance, updated_at: updatedAt });
    }
  }

  async updateBalanceDelta(id: string, delta: number, updatedAt: number): Promise<void> {
    const wallet = this.wallets.get(id);
    if (wallet) {
      this.wallets.set(id, {
        ...wallet,
        balance: wallet.balance + delta,
        updated_at: updatedAt,
      });
    }
  }
}
