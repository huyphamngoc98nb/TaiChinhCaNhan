import type { CreditCardAlert } from '../domain/credit-card-alert.model';
import { CreditCardAlertBanner } from './CreditCardAlertBanner';

export interface CreditCardAlertsPanelProps {
  alerts: CreditCardAlert[];
  loading: boolean;
  onAlertPress?: (walletId: string) => void;
  formatAmount: (amount: number) => string;
  locale: string;
}

export function CreditCardAlertsPanel({
  alerts,
  loading,
  onAlertPress,
  formatAmount,
  locale,
}: CreditCardAlertsPanelProps) {
  if (loading) {
    return (
      <div className="mb-4">
        <div className="h-12 w-full animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
        ⚠️ Cảnh báo thẻ tín dụng
      </p>
      {alerts.map((alert, index) => (
        <div
          key={`${alert.walletId}-${alert.type}-${alert.dueAt ?? alert.usagePercent ?? index}`}
          className="mb-2 last:mb-0"
        >
          <CreditCardAlertBanner
            alert={alert}
            onPress={onAlertPress}
            formatAmount={formatAmount}
            locale={locale}
          />
        </div>
      ))}
    </div>
  );
}
