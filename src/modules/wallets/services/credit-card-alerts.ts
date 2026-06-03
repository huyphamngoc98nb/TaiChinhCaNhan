import type { CreditCardAlert } from '../domain/credit-card-alert.model';
import type { CreditCardSummary } from './credit-card.service';

const DUE_SOON_THRESHOLD_DAYS = 7;
const OVER_LIMIT_THRESHOLD = 0.8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeCreditCardAlerts(
  summaries: CreditCardSummary[],
  asOf: number
): CreditCardAlert[] {
  const alerts: CreditCardAlert[] = [];

  for (const summary of summaries) {
    const { wallet, outstandingBalance, period } = summary;

    if (period) {
      const daysLeft = Math.ceil((period.dueAt - asOf) / MS_PER_DAY);

      if (asOf > period.dueAt && outstandingBalance > 0) {
        alerts.push({
          type: 'overdue',
          walletId: wallet.id,
          walletName: wallet.name,
          amount: outstandingBalance,
          dueAt: period.dueAt,
        });
        continue;
      }

      if (daysLeft >= 0 && daysLeft <= DUE_SOON_THRESHOLD_DAYS && outstandingBalance > 0) {
        alerts.push({
          type: 'due_soon',
          walletId: wallet.id,
          walletName: wallet.name,
          amount: outstandingBalance,
          dueAt: period.dueAt,
          daysLeft,
        });
      }
    }

    if (
      wallet.credit_limit != null &&
      wallet.credit_limit > 0 &&
      outstandingBalance > 0
    ) {
      const usage = outstandingBalance / wallet.credit_limit;
      if (usage >= OVER_LIMIT_THRESHOLD) {
        alerts.push({
          type: 'over_limit',
          walletId: wallet.id,
          walletName: wallet.name,
          amount: outstandingBalance,
          usagePercent: Math.round(usage * 100),
        });
      }
    }
  }

  const order: Record<CreditCardAlert['type'], number> = {
    overdue: 0,
    due_soon: 1,
    over_limit: 2,
  };

  return alerts.sort((a, b) => order[a.type] - order[b.type]);
}
