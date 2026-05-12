import { useMemo } from 'react';
import { Wallet, AccountType } from '../repositories/sqlite-wallet.repository';
import { WalletCard, ACCOUNT_TYPE_LABELS } from './WalletCard';
import { useCurrency } from '@/shared/context/CurrencyContext';

interface Props {
  wallets: Wallet[];
  totalBalance: number;
  loading: boolean;
  error: string | null;
  onWalletClick?: (wallet: Wallet) => void;
  onAddClick?: () => void;
}

const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'cash', 'bank', 'e_wallet', 'credit_card', 'investment', 'other',
];

export function WalletList({
  wallets,
  totalBalance,
  loading,
  error,
  onWalletClick,
  onAddClick,
}: Props) {
  const { formatAmount } = useCurrency();

  const grouped = useMemo(() => {
    const map = new Map<AccountType, Wallet[]>();
    for (const type of ACCOUNT_TYPE_ORDER) {
      map.set(type, []);
    }
    for (const w of wallets) {
      const bucket = map.get(w.account_type) ?? [];
      bucket.push(w);
      map.set(w.account_type, bucket);
    }
    return map;
  }, [wallets]);

  if (loading) {
    return (
      <div style={{ padding: '16px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-2xl h-24 mb-3 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', color: '#ef4444', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      {/* Total balance header */}
      <div
        className="rounded-2xl p-5 mb-5"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
        }}
      >
        <p className="text-[13px] text-indigo-100 mb-1">Tổng tài sản</p>
        <p className="text-[28px] font-bold text-white tabular-nums">
          {formatAmount(totalBalance)}
        </p>
        <p className="text-[11px] text-indigo-200 mt-1">
          Không bao gồm ví đánh dấu loại trừ
        </p>
      </div>

      {/* Add wallet button */}
      <button
        onClick={onAddClick}
        className="w-full h-12 rounded-2xl border-2 border-dashed border-indigo-300 text-indigo-500 text-[14px] font-semibold mb-5 hover:bg-indigo-50 transition-colors"
      >
        + Thêm tài khoản
      </button>

      {/* Grouped wallet cards */}
      {wallets.length === 0 ? (
        <div className="text-center text-gray-400 mt-10">
          <p className="text-4xl mb-3">💼</p>
          <p className="text-[15px]">Chưa có tài khoản nào</p>
          <p className="text-[13px] text-gray-300 mt-1">
            Nhấn "+ Thêm tài khoản" để bắt đầu
          </p>
        </div>
      ) : (
        ACCOUNT_TYPE_ORDER.map((type) => {
          const group = grouped.get(type) ?? [];
          if (group.length === 0) return null;
          return (
            <div key={type} className="mb-4">
              <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {ACCOUNT_TYPE_LABELS[type]}
              </p>
              {group.map((w) => (
                <WalletCard key={w.id} wallet={w} onClick={onWalletClick} />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
