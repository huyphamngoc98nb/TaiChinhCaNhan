import { Wallet, AccountType } from '../repositories/sqlite-wallet.repository';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCreditCardSummary } from '../hooks/useCreditCardSummary';
import { getAppLocale } from '@/shared/utils/locale';

interface Props {
  wallet: Wallet;
  onClick?: (wallet: Wallet) => void;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash:        'Tiền mặt',
  bank:        'Ngân hàng',
  credit_card: 'Thẻ tín dụng',
  e_wallet:    'Ví điện tử',
  investment:  'Đầu tư',
  other:       'Khác',
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  cash:        '💵',
  bank:        '🏦',
  credit_card: '💳',
  e_wallet:    '📱',
  investment:  '📈',
  other:       '💼',
};

function formatDayMonth(value: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

export function WalletCard({ wallet, onClick }: Props) {
  const { formatAmount } = useCurrency();
  const { t, language } = useLanguage();
  const locale = getAppLocale(language);
  const { summary, loading: summaryLoading } = useCreditCardSummary(wallet);
  const accountTypeLabels: Record<AccountType, string> = {
    cash: t('wallets.account_cash'),
    bank: t('wallets.account_bank'),
    credit_card: t('wallets.account_credit_card'),
    e_wallet: t('wallets.account_e_wallet'),
    investment: t('wallets.account_investment'),
    other: t('wallets.account_other'),
  };

  const defaultIcon = ACCOUNT_TYPE_ICONS[wallet.account_type] ?? '💼';
  const displayIcon = wallet.icon && wallet.icon.trim() !== '' ? wallet.icon : defaultIcon;
  const bgColor     = wallet.color ?? '#6366F1';

  const isCreditCard = wallet.account_type === 'credit_card';
  const outstandingBalance = isCreditCard
    ? summary?.outstandingBalance ?? Math.max(0, -wallet.balance)
    : null;
  const availableCredit = summary?.availableCredit ?? null;
  const statementPeriod = summary?.period ?? null;
  const usagePercent =
    isCreditCard && wallet.credit_limit != null && wallet.credit_limit > 0
      ? Math.min(100, Math.max(0, ((outstandingBalance ?? 0) / wallet.credit_limit) * 100))
      : 0;
  const usageColor =
    usagePercent > 80 ? '#ef4444' : usagePercent >= 50 ? '#f59e0b' : '#10b981';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(wallet)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(wallet)}
      className="bg-white rounded-2xl p-4 mb-3 cursor-pointer active:scale-[0.98] transition-transform"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ backgroundColor: `${bgColor}26` }}
          >
            {displayIcon}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-gray-900 leading-tight">
              {wallet.name}
            </p>
            <p className="text-[12px] text-gray-500">
              {accountTypeLabels[wallet.account_type]}
            </p>
          </div>
        </div>

        {wallet.exclude_from_total === 1 && (
          <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {t('wallets.excluded_total_short')}
          </span>
        )}
      </div>

      {/* Balance */}
      <div className="mt-1">
        <p className="text-[12px] text-gray-400 mb-0.5">
          {wallet.account_type === 'credit_card'
            ? t('wallets.outstanding_balance')
            : t('wallets.balance')}
        </p>
        <p
          className="text-[20px] font-bold tabular-nums"
          style={{ color: wallet.balance < 0 ? '#ef4444' : '#111827' }}
        >
          {formatAmount(outstandingBalance ?? wallet.balance)}
        </p>
      </div>

      {/* Credit card extras */}
      {isCreditCard && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {wallet.credit_limit != null && (
              <div>
                <p className="text-[11px] text-gray-400">{t('wallets.credit_limit')}</p>
                <p className="text-[13px] font-semibold text-gray-700 tabular-nums">
                  {formatAmount(wallet.credit_limit)}
                </p>
              </div>
            )}
            {availableCredit != null && (
              <div>
                <p className="text-[11px] text-gray-400">Hạn mức còn lại</p>
                <p
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: availableCredit < 0 ? '#ef4444' : '#10b981' }}
                >
                  {formatAmount(availableCredit)}
                </p>
              </div>
            )}
            {statementPeriod && (
              <div className="col-span-2">
                <p className="text-[11px] text-gray-400">Ngày sao kê / đến hạn</p>
                <p className="text-[13px] font-semibold text-gray-700">
                  {formatDayMonth(statementPeriod.closingAt, locale)} / {formatDayMonth(statementPeriod.dueAt, locale)}
                </p>
              </div>
            )}
          </div>
          {/* Inline alert badge — chỉ hiện với credit card */}
          {isCreditCard && (() => {
            const asOf = Date.now();
            const balance = outstandingBalance ?? 0;
            const isOverdue =
              statementPeriod != null && asOf > statementPeriod.dueAt && balance > 0;
            const msPerDay = 86400000;
            const daysLeft = statementPeriod
              ? Math.ceil((statementPeriod.dueAt - asOf) / msPerDay)
              : null;
            const isDueSoon =
              !isOverdue &&
              daysLeft != null &&
              daysLeft >= 0 &&
              daysLeft <= 7 &&
              balance > 0;

            if (!isOverdue && !isDueSoon) return null;

            return (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold mb-2"
                style={
                  isOverdue
                    ? { background: '#fef2f2', color: '#b91c1c' }
                    : { background: '#fffbeb', color: '#92400e' }
                }
              >
                <span>{isOverdue ? '🔴' : '🟡'}</span>
                <span>
                  {isOverdue
                    ? 'Quá hạn thanh toán'
                    : daysLeft === 0
                      ? 'Đến hạn hôm nay'
                      : `Còn ${daysLeft} ngày đến hạn`}
                </span>
              </div>
            );
          })()}
          {wallet.credit_limit != null && wallet.credit_limit > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">Đã dùng hạn mức</p>
                <p className="text-[11px] font-semibold text-gray-600 tabular-nums">
                  {Math.round(usagePercent)}%
                </p>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${usagePercent}%`, backgroundColor: usageColor }}
                />
              </div>
            </div>
          )}
          {summaryLoading && (
            <p className="text-[11px] text-gray-400">Đang cập nhật...</p>
          )}
        </div>
      )}
    </div>
  );
}
