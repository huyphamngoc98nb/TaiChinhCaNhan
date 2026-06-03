import type { KeyboardEvent } from 'react';
import type { CreditCardAlert } from '../domain/credit-card-alert.model';

export interface CreditCardAlertBannerProps {
  alert: CreditCardAlert;
  onPress?: (walletId: string) => void;
  formatAmount: (amount: number) => string;
  locale: string;
}

const ALERT_CONFIG = {
  overdue: { bg: '#fef2f2', border: '#fecaca', icon: '🔴', textColor: '#b91c1c' },
  due_soon: { bg: '#fffbeb', border: '#fde68a', icon: '🟡', textColor: '#92400e' },
  over_limit: { bg: '#fff7ed', border: '#fed7aa', icon: '🟠', textColor: '#c2410c' },
} satisfies Record<
  CreditCardAlert['type'],
  { bg: string; border: string; icon: string; textColor: string }
>;

function getAlertTitle(alert: CreditCardAlert): string {
  if (alert.type === 'overdue') return 'Quá hạn thanh toán';
  if (alert.type === 'due_soon') {
    return alert.daysLeft === 0
      ? 'Đến hạn hôm nay'
      : `Còn ${alert.daysLeft} ngày đến hạn`;
  }
  return `Đã dùng ${alert.usagePercent}% hạn mức`;
}

function fmtDayMonth(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(ts));
}

export function CreditCardAlertBanner({
  alert,
  onPress,
  formatAmount,
  locale,
}: CreditCardAlertBannerProps) {
  const config = ALERT_CONFIG[alert.type];
  const amountLabel = alert.type === 'over_limit' ? 'Đã dùng' : 'Dư nợ';

  const handlePress = () => {
    onPress?.(alert.walletId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handlePress();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handlePress}
      onKeyDown={handleKeyDown}
      className="w-full cursor-pointer rounded-xl border p-3 text-left transition-transform active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-1"
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
        color: config.textColor,
        ['--tw-ring-color' as string]: config.border,
      }}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-[15px] leading-5" aria-hidden="true">
          {config.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-5">
            <span className="font-semibold">{alert.walletName}</span>
            <span> — {getAlertTitle(alert)}</span>
          </p>
          <p className="mt-0.5 text-[12px] leading-5 tabular-nums opacity-90">
            {amountLabel}: {formatAmount(alert.amount)}
            {alert.dueAt != null ? ` - Hạn: ${fmtDayMonth(alert.dueAt, locale)}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
