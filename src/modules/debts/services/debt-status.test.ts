import { describe, expect, it } from 'vitest';
import {
  buildDebtDashboardSummary,
  computeCreditCardDebtStatus,
  computeLoanDebtStatus,
} from './debt-status';

const AS_OF = new Date('2026-06-15T08:00:00').getTime();

function day(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

describe('debt status helpers', () => {
  it('classifies due soon and overdue loans without UI date logic', () => {
    expect(computeLoanDebtStatus({
      due_date: '2026-06-20',
      remaining: 1_000_000,
      status: 'active',
    }, AS_OF)).toBe('dueSoon');

    expect(computeLoanDebtStatus({
      due_date: '2026-06-14',
      remaining: 1_000_000,
      status: 'active',
    }, AS_OF)).toBe('overdue');

    expect(computeLoanDebtStatus({
      due_date: '2026-06-14',
      remaining: 0,
      status: 'active',
    }, AS_OF)).toBe('paidOff');
  });

  it('computes credit utilization and due status', () => {
    const status = computeCreditCardDebtStatus({
      wallet: { credit_limit: 10_000_000 },
      outstandingBalance: 8_000_000,
      period: {
        periodStart: day('2026-05-01'),
        periodEnd: day('2026-05-31'),
        closingAt: day('2026-05-31'),
        dueAt: day('2026-06-18'),
      },
    }, AS_OF);

    expect(status.status).toBe('dueSoon');
    expect(status.daysUntilDue).toBe(3);
    expect(status.utilizationPercent).toBe(80);
    expect(status.isHighUtilization).toBe(true);
  });

  it('summarizes only card debt and borrowed loans as current debt', () => {
    const summary = buildDebtDashboardSummary({
      creditCards: [{
        wallet: { credit_limit: 10_000_000 },
        outstandingBalance: 8_500_000,
        period: {
          periodStart: day('2026-05-01'),
          periodEnd: day('2026-05-31'),
          closingAt: day('2026-05-31'),
          dueAt: day('2026-06-18'),
        },
      }],
      loans: [
        { type: 'borrow', remaining: 2_000_000, due_date: '2026-06-14', status: 'active' },
        { type: 'lend', remaining: 5_000_000, due_date: '2026-06-17', status: 'active' },
      ],
    }, AS_OF);

    expect(summary.totalCurrentDebt).toBe(10_500_000);
    expect(summary.totalCreditCardDebt).toBe(8_500_000);
    expect(summary.dueWithinSevenDays).toBe(8_500_000);
    expect(summary.overdueCount).toBe(1);
    expect(summary.highUtilizationCount).toBe(1);
  });
});
