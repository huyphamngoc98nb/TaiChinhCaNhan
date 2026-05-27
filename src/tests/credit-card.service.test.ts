import { describe, expect, it } from 'vitest';
import { getCreditCardStatementPeriod } from '@/modules/wallets/services/credit-card.service';
import { SyncCreditCardStatementUseCase } from '@/modules/wallets/services/sync-credit-card-statement';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { InMemoryWalletRepository } from './fakes/in-memory-wallet.repository';

function timestamp(year: number, monthIndex: number, day: number, hour = 12): number {
  return new Date(year, monthIndex, day, hour, 0, 0, 0).getTime();
}

function wallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: 'cc-1',
    name: 'Visa',
    currency: 'VND',
    balance: -500_000,
    account_type: 'credit_card',
    icon: null,
    color: null,
    sort_order: 0,
    is_active: 1,
    exclude_from_total: 0,
    credit_limit: 5_000_000,
    statement_day: 15,
    due_day: 5,
    annual_fee: null,
    created_at: 0,
    updated_at: 0,
    ...overrides,
  };
}

function lifecyclePeriod(creditCard: Wallet, asOf: number) {
  const currentPeriod = getCreditCardStatementPeriod(creditCard, asOf)!;
  return getCreditCardStatementPeriod(creditCard, currentPeriod.periodStart - 1)!;
}

describe('credit card statement cycle', () => {
  it('keeps purchases on or before closing date in the current cycle', () => {
    const period = getCreditCardStatementPeriod(wallet(), timestamp(2026, 4, 15));

    expect(new Date(period!.periodStart).toDateString()).toBe(new Date(2026, 3, 16).toDateString());
    expect(new Date(period!.periodEnd).toDateString()).toBe(new Date(2026, 4, 15).toDateString());
    expect(new Date(period!.dueAt).toDateString()).toBe(new Date(2026, 5, 5).toDateString());
  });

  it('moves purchases after closing date into the next billing cycle', () => {
    const period = getCreditCardStatementPeriod(wallet(), timestamp(2026, 4, 16));

    expect(new Date(period!.periodStart).toDateString()).toBe(new Date(2026, 4, 16).toDateString());
    expect(new Date(period!.periodEnd).toDateString()).toBe(new Date(2026, 5, 15).toDateString());
    expect(new Date(period!.dueAt).toDateString()).toBe(new Date(2026, 6, 5).toDateString());
  });
});

describe('SyncCreditCardStatementUseCase', () => {
  it('creates a statement when none exists', async () => {
    const asOf = timestamp(2026, 4, 16);
    const creditCard = wallet();
    const period = lifecyclePeriod(creditCard, asOf);
    const repo = new InMemoryWalletRepository([creditCard]);
    repo.setCreditCardStatementBalance(
      creditCard.id,
      period.periodStart,
      period.periodEnd,
      1_200_000
    );

    await new SyncCreditCardStatementUseCase(repo).execute(creditCard, asOf);

    const statement = repo.getStatement(creditCard.id, period.periodStart, period.periodEnd);
    expect(statement).toMatchObject({
      wallet_id: creditCard.id,
      statement_balance: 1_200_000,
      paid_amount: 0,
      remaining_amount: 1_200_000,
      status: 'open',
    });
  });

  it('updates an existing statement after payment', async () => {
    const asOf = timestamp(2026, 4, 16);
    const creditCard = wallet();
    const period = lifecyclePeriod(creditCard, asOf);
    const repo = new InMemoryWalletRepository([creditCard]);
    repo.setCreditCardStatementBalance(
      creditCard.id,
      period.periodStart,
      period.periodEnd,
      1_200_000
    );

    const sync = new SyncCreditCardStatementUseCase(repo);
    await sync.execute(creditCard, asOf);
    const firstStatement = repo.getStatement(creditCard.id, period.periodStart, period.periodEnd);

    repo.setPaidAmountForStatement(creditCard.id, period.periodStart, period.dueAt, 500_000);
    await sync.execute(creditCard, asOf);

    const updatedStatement = repo.getStatement(creditCard.id, period.periodStart, period.periodEnd);
    expect(updatedStatement?.id).toBe(firstStatement?.id);
    expect(updatedStatement).toMatchObject({
      statement_balance: 1_200_000,
      paid_amount: 500_000,
      remaining_amount: 700_000,
      status: 'partial',
    });
  });

  it('transitions from open to partial to paid', async () => {
    const asOf = timestamp(2026, 4, 16);
    const creditCard = wallet();
    const period = lifecyclePeriod(creditCard, asOf);
    const repo = new InMemoryWalletRepository([creditCard]);
    repo.setCreditCardStatementBalance(creditCard.id, period.periodStart, period.periodEnd, 900_000);

    const sync = new SyncCreditCardStatementUseCase(repo);
    await sync.execute(creditCard, asOf);
    expect(repo.getStatement(creditCard.id, period.periodStart, period.periodEnd)?.status).toBe(
      'open'
    );

    repo.setPaidAmountForStatement(creditCard.id, period.periodStart, period.dueAt, 300_000);
    await sync.execute(creditCard, asOf);
    expect(repo.getStatement(creditCard.id, period.periodStart, period.periodEnd)?.status).toBe(
      'partial'
    );

    repo.setPaidAmountForStatement(creditCard.id, period.periodStart, period.dueAt, 900_000);
    await sync.execute(creditCard, asOf);
    expect(repo.getStatement(creditCard.id, period.periodStart, period.periodEnd)?.status).toBe(
      'paid'
    );
  });

  it('marks the just-closed unpaid statement overdue after its due date', async () => {
    const closedStatementAsOf = timestamp(2026, 4, 15);
    const overdueAsOf = timestamp(2026, 5, 6);
    const creditCard = wallet();
    const period = getCreditCardStatementPeriod(creditCard, closedStatementAsOf)!;
    const repo = new InMemoryWalletRepository([creditCard]);
    repo.setCreditCardStatementBalance(creditCard.id, period.periodStart, period.periodEnd, 900_000);

    const sync = new SyncCreditCardStatementUseCase(repo);
    await sync.execute(creditCard, closedStatementAsOf);
    expect(repo.getStatement(creditCard.id, period.periodStart, period.periodEnd)?.status).toBe(
      'open'
    );

    await sync.execute(creditCard, overdueAsOf);
    expect(repo.getStatement(creditCard.id, period.periodStart, period.periodEnd)?.status).toBe(
      'overdue'
    );
  });
});
