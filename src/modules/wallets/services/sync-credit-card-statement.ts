import { getCreditCardStatementPeriod } from './credit-card.service';
import type { CreditCardStatementPeriod } from './credit-card.service';
import type {
  CreditCardStatementStatus,
  IWalletRepository,
  Wallet,
} from '../repositories/wallet.repository';

function deriveStatus(
  statementBalance: number,
  paidAmount: number,
  dueAt: number,
  asOf: number
): CreditCardStatementStatus {
  if (statementBalance <= 0) return 'paid';
  if (asOf < dueAt) {
    if (paidAmount <= 0) return 'open';
    if (paidAmount >= statementBalance) return 'paid';
    return 'partial';
  }
  if (paidAmount >= statementBalance) return 'paid';
  return 'overdue';
}

function getStatementPeriodForLifecycle(
  wallet: Wallet,
  asOf: number
): CreditCardStatementPeriod | null {
  const currentPeriod = getCreditCardStatementPeriod(wallet, asOf);
  if (!currentPeriod) return null;

  const asOfDate = new Date(asOf);
  const currentPeriodEnd = new Date(currentPeriod.periodEnd);
  const isAfterCurrentMonthClosing =
    currentPeriodEnd.getFullYear() !== asOfDate.getFullYear() ||
    currentPeriodEnd.getMonth() !== asOfDate.getMonth();
  const isCurrentClosingDay =
    currentPeriodEnd.getFullYear() === asOfDate.getFullYear() &&
    currentPeriodEnd.getMonth() === asOfDate.getMonth() &&
    currentPeriodEnd.getDate() === asOfDate.getDate();

  const previousPeriod = getCreditCardStatementPeriod(wallet, currentPeriod.periodStart - 1);
  if (
    previousPeriod &&
    !isCurrentClosingDay &&
    (isAfterCurrentMonthClosing || asOf > previousPeriod.periodEnd)
  ) {
    return previousPeriod;
  }

  return currentPeriod;
}

export class SyncCreditCardStatementUseCase {
  constructor(private readonly walletRepo: IWalletRepository) {}

  async execute(wallet: Wallet, asOf: number = Date.now()): Promise<void> {
    if (wallet.account_type !== 'credit_card') return;

    const period = getStatementPeriodForLifecycle(wallet, asOf);
    if (!period) return;

    const [statementBalance, paidAmount] = await Promise.all([
      this.walletRepo.getCreditCardStatementBalance(
        wallet.id,
        period.periodStart,
        period.periodEnd
      ),
      this.walletRepo.getPaidAmountForStatement(wallet.id, period.periodStart, period.dueAt),
    ]);

    const remainingAmount = Math.max(0, statementBalance - paidAmount);
    const status = deriveStatus(statementBalance, paidAmount, period.dueAt, asOf);

    await this.walletRepo.upsertCreditCardStatement({
      wallet_id: wallet.id,
      period_start: period.periodStart,
      period_end: period.periodEnd,
      closing_at: period.closingAt,
      due_at: period.dueAt,
      statement_balance: statementBalance,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      status,
      now: asOf,
    });
  }
}
