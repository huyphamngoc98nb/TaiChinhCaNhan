import type { IWalletRepository, Wallet } from '../repositories/wallet.repository';
import { translations, type TranslationPath } from '@/shared/constants/translations';

function defaultText(path: TranslationPath): string {
  const keys = path.split('.');
  let current: unknown = translations.en;

  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return path;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : path;
}

export interface CreditCardStatementPeriod {
  periodStart: number;
  periodEnd: number;
  closingAt: number;
  dueAt: number;
}

export interface CreditCardSummary {
  wallet: Wallet;
  outstandingBalance: number;
  statementBalance: number;
  availableCredit: number | null;
  period: CreditCardStatementPeriod | null;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampedDate(
  year: number,
  monthIndex: number,
  day: number,
  endOfDay = false
): Date {
  const clampedDay = Math.min(Math.max(day, 1), daysInMonth(year, monthIndex));
  const date = new Date(year, monthIndex, clampedDay);
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildDueDate(closingAt: Date, statementDay: number, dueDay: number): Date {
  const dueMonthOffset = dueDay > statementDay ? 0 : 1;
  return clampedDate(
    closingAt.getFullYear(),
    closingAt.getMonth() + dueMonthOffset,
    dueDay,
    true
  );
}

export function getCreditCardStatementPeriod(
  wallet: Pick<Wallet, 'statement_day' | 'due_day'>,
  asOf: number = Date.now()
): CreditCardStatementPeriod | null {
  if (!wallet.statement_day || !wallet.due_day) return null;

  const date = new Date(asOf);
  const statementDay = wallet.statement_day;
  const dueDay = wallet.due_day;
  const closingThisMonth = clampedDate(
    date.getFullYear(),
    date.getMonth(),
    statementDay,
    true
  );

  const isInCycleClosingThisMonth = asOf <= closingThisMonth.getTime();
  const closingAt = isInCycleClosingThisMonth
    ? closingThisMonth
    : clampedDate(date.getFullYear(), date.getMonth() + 1, statementDay, true);
  const previousClosing = clampedDate(
    addMonths(closingAt, -1).getFullYear(),
    addMonths(closingAt, -1).getMonth(),
    statementDay,
    true
  );
  const periodStart = addDays(previousClosing, 1);
  periodStart.setHours(0, 0, 0, 0);
  const dueAt = buildDueDate(closingAt, statementDay, dueDay);

  return {
    periodStart: periodStart.getTime(),
    periodEnd: closingAt.getTime(),
    closingAt: closingAt.getTime(),
    dueAt: dueAt.getTime(),
  };
}

export class CreditCardService {
  constructor(private readonly walletRepository: IWalletRepository) {}

  async getSummary(wallet: Wallet, asOf: number = Date.now()): Promise<CreditCardSummary> {
    if (wallet.account_type !== 'credit_card') {
      throw new Error(defaultText('wallets.service_not_credit_card'));
    }

    const period = getCreditCardStatementPeriod(wallet, asOf);
    const [outstandingBalance, statementBalance, availableCredit] = await Promise.all([
      this.walletRepository.getCreditCardOutstandingBalance(wallet.id),
      period
        ? this.walletRepository.getCreditCardStatementBalance(
            wallet.id,
            period.periodStart,
            period.periodEnd
          )
        : Promise.resolve(0),
      this.walletRepository.getCreditCardAvailableCredit(wallet.id),
    ]);

    return {
      wallet,
      outstandingBalance,
      statementBalance,
      availableCredit,
      period,
    };
  }
}
