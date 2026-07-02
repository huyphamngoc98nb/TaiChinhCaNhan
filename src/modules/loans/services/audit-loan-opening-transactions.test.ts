import { describe, expect, it, vi } from 'vitest';
import type { Category } from '@/modules/categories/domain/category.model';
import type { Transaction } from '@/modules/transactions/domain/transaction.model';
import { InMemoryTransactionRepository } from '@/tests/fakes/in-memory-transaction.repository';
import { InMemoryWalletRepository } from '@/tests/fakes/in-memory-wallet.repository';
import type { ILoanRepository } from '../repositories/loan.repository';
import type { LoanWithSummary } from '../domain/loan.model';
import { auditLoanOpeningTransactions, type LoanOpeningAuditDeps } from './audit-loan-opening-transactions';

vi.mock('@/core/db/transaction-runner', () => ({
  sqliteTransactionRunner: async <T>(work: () => Promise<T>) => work(),
}));

vi.mock('@/core/telemetry/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const category: Category = {
  id: 'cat-cho-vay',
  slug: 'cho_vay',
  name: 'Cho vay',
  type: 'expense',
  icon: null,
  color: null,
  description: null,
  is_system: 1,
  created_at: 0,
  updated_at: 0,
};

function transaction(id: string, createdAt: number, source = false): Transaction {
  return {
    id,
    wallet_id: 'wallet-1',
    category_id: category.id,
    type: 'expense',
    amount: 1_000_000,
    note: 'Loan to Alice',
    to_wallet_id: null,
    exclude_from_total: false,
    is_budget_offset: false,
    offset_budget_id: null,
    source_type: source ? 'loan' : null,
    source_id: source ? 'loan-1' : null,
    source_event: source ? 'opening' : null,
    transaction_date: new Date('2026-06-01T00:00:00').getTime(),
    created_at: createdAt,
    updated_at: createdAt,
    deleted_at: null,
  };
}

function loan(overrides: Partial<LoanWithSummary> = {}): LoanWithSummary {
  return {
    id: 'loan-1',
    wallet_id: 'wallet-1',
    skip_transaction: false,
    linked_transaction_id: 'tx-linked',
    type: 'lend',
    contact_name: 'Alice',
    contact_info: null,
    principal: 1_000_000,
    loan_date: '2026-06-01',
    due_date: null,
    note: null,
    status: 'settled',
    created_at: 1_000,
    updated_at: 1_000,
    deleted_at: null,
    paid_amount: 1_000_000,
    remaining: 0,
    ...overrides,
  };
}

function deps(loans: LoanWithSummary[], transactions: Transaction[]): LoanOpeningAuditDeps {
  return {
    loanRepo: {
      listLoans: vi.fn(async () => loans),
    } as unknown as ILoanRepository,
    transactionRepo: new InMemoryTransactionRepository(transactions),
    walletRepo: new InMemoryWalletRepository([{
      id: 'wallet-1',
      name: 'Cash',
      currency: 'VND',
      balance: -2_000_000,
      account_type: 'cash',
      icon: null,
      color: null,
      sort_order: 0,
      is_active: 1,
      exclude_from_total: 0,
      credit_limit: null,
      statement_day: null,
      due_day: null,
      annual_fee: null,
      created_at: 0,
      updated_at: 0,
    }]),
    categoryRepo: {
      getBySlug: vi.fn(async () => category),
      list: vi.fn(async () => [category]),
    },
  };
}

describe('auditLoanOpeningTransactions', () => {
  it('detects first, then repairs only the strong orphan duplicate and reverses balance once', async () => {
    const auditDeps = deps(
      [loan()],
      [transaction('tx-linked', 10_000, true), transaction('tx-orphan', 11_000)]
    );

    const audit = await auditLoanOpeningTransactions(auditDeps);
    expect(audit.findings).toEqual([
      expect.objectContaining({
        linked_transaction_id: 'tx-linked',
        candidate_transaction_id: 'tx-orphan',
        repaired: false,
      }),
    ]);
    await expect(auditDeps.transactionRepo.getById('tx-orphan')).resolves.not.toBeNull();

    const repair = await auditLoanOpeningTransactions(auditDeps, { repair: true });
    expect(repair.repaired_count).toBe(1);
    await expect(auditDeps.transactionRepo.getById('tx-orphan')).resolves.toBeNull();
    await expect(auditDeps.walletRepo.getById('wallet-1')).resolves.toMatchObject({
      balance: -1_000_000,
    });

    const repeated = await auditLoanOpeningTransactions(auditDeps, { repair: true });
    expect(repeated.repaired_count).toBe(0);
    await expect(auditDeps.walletRepo.getById('wallet-1')).resolves.toMatchObject({
      balance: -1_000_000,
    });
  });

  it('does not delete a valid unlinked legacy transaction', async () => {
    const oldLegacy = transaction('tx-legacy-valid', 10_000);
    const auditDeps = deps(
      [loan({ linked_transaction_id: 'tx-linked' })],
      [transaction('tx-linked', 10_000_000, true), oldLegacy]
    );

    const result = await auditLoanOpeningTransactions(auditDeps, { repair: true });

    expect(result.findings).toEqual([]);
    expect(result.repaired_count).toBe(0);
    await expect(auditDeps.transactionRepo.getById('tx-legacy-valid')).resolves.not.toBeNull();
  });
});
