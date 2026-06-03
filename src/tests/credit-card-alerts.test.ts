import { describe, expect, it } from 'vitest';
import { computeCreditCardAlerts } from '@/modules/wallets/services/credit-card-alerts';
import type {
  CreditCardStatementPeriod,
  CreditCardSummary,
} from '@/modules/wallets/services/credit-card.service';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';

const DAY = 24 * 60 * 60 * 1000;
const AS_OF = new Date(2026, 4, 10, 12, 0, 0, 0).getTime();

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

function period(dueAt: number): CreditCardStatementPeriod {
  return {
    periodStart: AS_OF - 20 * DAY,
    periodEnd: AS_OF - 10 * DAY,
    closingAt: AS_OF - 10 * DAY,
    dueAt,
  };
}

function summary(overrides: Partial<CreditCardSummary> = {}): CreditCardSummary {
  return {
    wallet: wallet(),
    outstandingBalance: 500_000,
    statementBalance: 500_000,
    availableCredit: 4_500_000,
    period: period(AS_OF + 10 * DAY),
    ...overrides,
  };
}

describe('computeCreditCardAlerts', () => {
  it('emits overdue when a wallet is past due', () => {
    const dueAt = AS_OF - DAY;

    const alerts = computeCreditCardAlerts(
      [
        summary({
          period: period(dueAt),
        }),
      ],
      AS_OF
    );

    expect(alerts).toEqual([
      {
        type: 'overdue',
        walletId: 'cc-1',
        walletName: 'Visa',
        amount: 500_000,
        dueAt,
      },
    ]);
  });

  it('emits due_soon when a wallet is due in 3 days', () => {
    const dueAt = AS_OF + 3 * DAY;

    const alerts = computeCreditCardAlerts(
      [
        summary({
          period: period(dueAt),
        }),
      ],
      AS_OF
    );

    expect(alerts).toEqual([
      {
        type: 'due_soon',
        walletId: 'cc-1',
        walletName: 'Visa',
        amount: 500_000,
        dueAt,
        daysLeft: 3,
      },
    ]);
  });

  it('does not alert when a past-due wallet is fully paid', () => {
    const alerts = computeCreditCardAlerts(
      [
        summary({
          outstandingBalance: 0,
          period: period(AS_OF - DAY),
        }),
      ],
      AS_OF
    );

    expect(alerts).toEqual([]);
  });

  it('emits over_limit when usage reaches 90 percent', () => {
    const alerts = computeCreditCardAlerts(
      [
        summary({
          wallet: wallet({ credit_limit: 1_000_000 }),
          outstandingBalance: 900_000,
          availableCredit: 100_000,
        }),
      ],
      AS_OF
    );

    expect(alerts).toEqual([
      {
        type: 'over_limit',
        walletId: 'cc-1',
        walletName: 'Visa',
        amount: 900_000,
        usagePercent: 90,
      },
    ]);
  });

  it('does not emit over_limit when usage is 79 percent', () => {
    const alerts = computeCreditCardAlerts(
      [
        summary({
          wallet: wallet({ credit_limit: 1_000_000 }),
          outstandingBalance: 790_000,
          availableCredit: 210_000,
        }),
      ],
      AS_OF
    );

    expect(alerts).toEqual([]);
  });

  it('checks only over_limit when the wallet has no statement period', () => {
    const alerts = computeCreditCardAlerts(
      [
        summary({
          wallet: wallet({
            credit_limit: 1_000_000,
            statement_day: null,
            due_day: null,
          }),
          outstandingBalance: 900_000,
          availableCredit: 100_000,
          period: null,
        }),
      ],
      AS_OF
    );

    expect(alerts).toEqual([
      {
        type: 'over_limit',
        walletId: 'cc-1',
        walletName: 'Visa',
        amount: 900_000,
        usagePercent: 90,
      },
    ]);
  });

  it('emits only overdue when a wallet is both overdue and over limit', () => {
    const dueAt = AS_OF - DAY;

    const alerts = computeCreditCardAlerts(
      [
        summary({
          wallet: wallet({ credit_limit: 1_000_000 }),
          outstandingBalance: 900_000,
          availableCredit: 100_000,
          period: period(dueAt),
        }),
      ],
      AS_OF
    );

    expect(alerts).toEqual([
      {
        type: 'overdue',
        walletId: 'cc-1',
        walletName: 'Visa',
        amount: 900_000,
        dueAt,
      },
    ]);
  });
});
