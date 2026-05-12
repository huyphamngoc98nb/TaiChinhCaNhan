import { Wallet, AccountType } from '../repositories/sqlite-wallet.repository';
import { useCurrency } from '@/shared/context/CurrencyContext';

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

export function WalletCard({ wallet, onClick }: Props) {
  const { formatAmount } = useCurrency();

  const defaultIcon = ACCOUNT_TYPE_ICONS[wallet.account_type] ?? '💼';
  const displayIcon = wallet.icon && wallet.icon.trim() !== '' ? wallet.icon : defaultIcon;
  const bgColor     = wallet.color ?? '#6366F1';

  const availableCredit =
    wallet.account_type === 'credit_card' && wallet.credit_limit != null
      ? wallet.credit_limit + wallet.balance   // balance is negative when owed
      : null;

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
              {ACCOUNT_TYPE_LABELS[wallet.account_type]}
            </p>
          </div>
        </div>

        {wallet.exclude_from_total === 1 && (
          <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            Không tính tổng
          </span>
        )}
      </div>

      {/* Balance */}
      <div className="mt-1">
        <p className="text-[12px] text-gray-400 mb-0.5">Số dư</p>
        <p
          className="text-[20px] font-bold tabular-nums"
          style={{ color: wallet.balance < 0 ? '#ef4444' : '#111827' }}
        >
          {formatAmount(wallet.balance)}
        </p>
      </div>

      {/* Credit card extras */}
      {wallet.account_type === 'credit_card' && wallet.credit_limit != null && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4">
          <div>
            <p className="text-[11px] text-gray-400">Hạn mức</p>
            <p className="text-[13px] font-semibold text-gray-700 tabular-nums">
              {formatAmount(wallet.credit_limit)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Khả dụng</p>
            <p
              className="text-[13px] font-semibold tabular-nums"
              style={{ color: (availableCredit ?? 0) < 0 ? '#ef4444' : '#10b981' }}
            >
              {formatAmount(availableCredit ?? 0)}
            </p>
          </div>
          {wallet.due_day != null && (
            <div>
              <p className="text-[11px] text-gray-400">Đến hạn</p>
              <p className="text-[13px] font-semibold text-gray-700">
                Ngày {wallet.due_day}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
