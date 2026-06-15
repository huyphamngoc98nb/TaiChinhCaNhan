import type { CreditCardAlert } from '../domain/credit-card-alert.model';
import { computeCreditCardDebtStatus } from '@/modules/debts/services/debt-status';
import type { CreditCardSummary } from './credit-card.service';

export function computeCreditCardAlerts(
  summaries: CreditCardSummary[],
  asOf: number
): CreditCardAlert[] {
  const alerts: CreditCardAlert[] = [];

  for (const summary of summaries) {
    const { wallet, outstandingBalance, period } = summary;
    const debtStatus = computeCreditCardDebtStatus(summary, asOf);

    if (period) {
      if (debtStatus.status === 'overdue') {
        alerts.push({
          type: 'overdue',
          walletId: wallet.id,
          walletName: wallet.name,
          amount: outstandingBalance,
          dueAt: period.dueAt,
        });
        continue;
      }

      if (debtStatus.status === 'dueSoon') {
        alerts.push({
          type: 'due_soon',
          walletId: wallet.id,
          walletName: wallet.name,
          amount: outstandingBalance,
          dueAt: period.dueAt,
          daysLeft: debtStatus.daysUntilDue ?? 0,
        });
      }
    }

    if (debtStatus.isHighUtilization && debtStatus.utilizationPercent != null) {
      alerts.push({
        type: 'over_limit',
        walletId: wallet.id,
        walletName: wallet.name,
        amount: outstandingBalance,
        usagePercent: debtStatus.utilizationPercent,
      });
    }
  }

  const order: Record<CreditCardAlert['type'], number> = {
    overdue: 0,
    due_soon: 1,
    over_limit: 2,
  };

  return alerts.sort((a, b) => order[a.type] - order[b.type]);
}
