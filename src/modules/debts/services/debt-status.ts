import type { LoanWithSummary } from '@/modules/loans/domain/loan.model';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import type { CreditCardStatementPeriod } from '@/modules/wallets/services/credit-card.service';

const DUE_SOON_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CREDIT_UTILIZATION_WARNING = 0.8;

export type DueStatus = 'normal' | 'dueSoon' | 'overdue';
export type LoanDebtStatus = 'active' | 'dueSoon' | 'overdue' | 'paidOff';

export interface CreditCardDebtStatus {
  status: DueStatus;
  daysUntilDue: number | null;
  utilization: number | null;
  utilizationPercent: number | null;
  isHighUtilization: boolean;
}

export interface DebtDashboardSummary {
  totalCurrentDebt: number;
  totalCreditCardDebt: number;
  dueWithinSevenDays: number;
  overdueCount: number;
  highUtilizationCount: number;
  alertCount: number;
}

export function startOfLocalDay(value: number = Date.now()): number {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysUntil(dueAt: number, asOf: number = Date.now()): number {
  return Math.ceil((startOfLocalDay(dueAt) - startOfLocalDay(asOf)) / MS_PER_DAY);
}

export function computeDueStatus(
  dueAt: number | null | undefined,
  amountRemaining: number,
  asOf: number = Date.now()
): DueStatus {
  if (!dueAt || amountRemaining <= 0) return 'normal';

  const daysLeft = daysUntil(dueAt, asOf);
  if (daysLeft < 0) return 'overdue';
  if (daysLeft >= 1 && daysLeft <= DUE_SOON_DAYS) return 'dueSoon';
  if (daysLeft === 0) return 'dueSoon';
  return 'normal';
}

export function computeLoanDebtStatus(
  loan: Pick<LoanWithSummary, 'due_date' | 'remaining' | 'status'>,
  asOf: number = Date.now()
): LoanDebtStatus {
  if (loan.remaining <= 0 || loan.status === 'settled') return 'paidOff';
  if (loan.status !== 'active' || !loan.due_date) return 'active';

  const dueAt = new Date(`${loan.due_date}T00:00:00`).getTime();
  const dueStatus = computeDueStatus(dueAt, loan.remaining, asOf);
  if (dueStatus === 'overdue') return 'overdue';
  if (dueStatus === 'dueSoon') return 'dueSoon';
  return 'active';
}

export function computeCreditUtilization(
  outstandingBalance: number,
  creditLimit: number | null | undefined
): number | null {
  if (creditLimit == null || creditLimit <= 0) return null;
  return outstandingBalance / creditLimit;
}

export function computeCreditCardDebtStatus(
  input: {
    wallet: Pick<Wallet, 'credit_limit'>;
    outstandingBalance: number;
    period?: CreditCardStatementPeriod | null;
  },
  asOf: number = Date.now()
): CreditCardDebtStatus {
  const daysLeft = input.period ? daysUntil(input.period.dueAt, asOf) : null;
  const status = input.period
    ? computeDueStatus(input.period.dueAt, input.outstandingBalance, asOf)
    : 'normal';
  const utilization = computeCreditUtilization(
    input.outstandingBalance,
    input.wallet.credit_limit
  );

  return {
    status,
    daysUntilDue: daysLeft,
    utilization,
    utilizationPercent: utilization == null ? null : Math.round(utilization * 100),
    isHighUtilization: utilization != null && utilization >= CREDIT_UTILIZATION_WARNING,
  };
}

export function buildDebtDashboardSummary(
  input: {
    creditCards: Array<{
      wallet: Pick<Wallet, 'credit_limit'>;
      outstandingBalance: number;
      period?: CreditCardStatementPeriod | null;
    }>;
    loans: Array<Pick<LoanWithSummary, 'type' | 'remaining' | 'due_date' | 'status'>>;
  },
  asOf: number = Date.now()
): DebtDashboardSummary {
  const totalCreditCardDebt = input.creditCards.reduce(
    (total, card) => total + Math.max(0, card.outstandingBalance),
    0
  );

  const borrowedLoans = input.loans.filter((loan) => loan.type === 'borrow');
  const totalBorrowedLoanDebt = borrowedLoans.reduce(
    (total, loan) => total + Math.max(0, loan.remaining),
    0
  );

  let dueWithinSevenDays = 0;
  let overdueCount = 0;
  let highUtilizationCount = 0;

  for (const card of input.creditCards) {
    const status = computeCreditCardDebtStatus(card, asOf);
    if (status.status === 'overdue') overdueCount += 1;
    if (status.status === 'dueSoon') dueWithinSevenDays += Math.max(0, card.outstandingBalance);
    if (status.isHighUtilization) highUtilizationCount += 1;
  }

  for (const loan of borrowedLoans) {
    const status = computeLoanDebtStatus(loan, asOf);
    if (status === 'overdue') overdueCount += 1;
    if (status === 'dueSoon') dueWithinSevenDays += Math.max(0, loan.remaining);
  }

  return {
    totalCurrentDebt: totalCreditCardDebt + totalBorrowedLoanDebt,
    totalCreditCardDebt,
    dueWithinSevenDays,
    overdueCount,
    highUtilizationCount,
    alertCount: overdueCount + highUtilizationCount,
  };
}
