import type {
  CreateWalletInput,
  IWalletRepository,
  UpdateWalletInput,
  Wallet,
} from '@/modules/wallets/repositories/wallet.repository';

export class InMemoryWalletRepository implements IWalletRepository {
  private wallets = new Map<string, Wallet>();

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

  async getTotalBalance(): Promise<number> {
    return Array.from(this.wallets.values())
      .filter((wallet) => wallet.exclude_from_total === 0)
      .reduce((total, wallet) => total + wallet.balance, 0);
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
