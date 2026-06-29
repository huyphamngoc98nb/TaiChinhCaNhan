import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';

export interface WalletBalanceSummary {
  totalNonCreditCardWalletBalance: number;
  totalAssets: number;
  totalCreditCardLiability: number;
  totalBalance: number;
}

export function buildWalletBalanceSummary(wallets: Wallet[]): WalletBalanceSummary {
  const totals = wallets.reduce(
    (summary, wallet) => {
      if (wallet.exclude_from_total === 1) return summary;

      const balance = Number(wallet.balance || 0);
      if (wallet.account_type === 'credit_card') {
        summary.totalCreditCardLiability += Math.max(0, -balance);
      } else {
        summary.totalNonCreditCardWalletBalance += balance;
        summary.totalAssets += Math.max(0, balance);
      }

      return summary;
    },
    {
      totalNonCreditCardWalletBalance: 0,
      totalAssets: 0,
      totalCreditCardLiability: 0,
    }
  );

  return {
    ...totals,
    totalBalance: totals.totalAssets - totals.totalCreditCardLiability,
  };
}
