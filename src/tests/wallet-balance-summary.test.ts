import { describe, expect, it } from 'vitest';
import type {
  AccountType,
  Wallet,
} from '@/modules/wallets/repositories/wallet.repository';
import { buildWalletBalanceSummary } from '@/modules/transactions/services/wallet-balance-summary';

function makeWallet(
  id: string,
  accountType: AccountType,
  balance: number,
  excludeFromTotal: 0 | 1 = 0
): Wallet {
  return {
    id,
    name: id,
    currency: 'VND',
    balance,
    account_type: accountType,
    icon: null,
    color: null,
    sort_order: 0,
    is_active: 1,
    exclude_from_total: excludeFromTotal,
    credit_limit: null,
    statement_day: null,
    due_day: null,
    annual_fee: null,
    created_at: 0,
    updated_at: 0,
  };
}

describe('wallet balance summary', () => {
  it('separates regular wallet balances from credit card liability', () => {
    const summary = buildWalletBalanceSummary([
      makeWallet('cash', 'cash', 1_000_000),
      makeWallet('bank', 'bank', 2_000_000),
      makeWallet('card', 'credit_card', -500_000),
    ]);

    expect(summary).toEqual({
      totalNonCreditCardWalletBalance: 3_000_000,
      totalAssets: 3_000_000,
      totalCreditCardLiability: 500_000,
      totalBalance: 2_500_000,
    });
  });

  it('includes negative regular wallet balances only in the new wallet total', () => {
    const summary = buildWalletBalanceSummary([
      makeWallet('cash', 'cash', 1_000_000),
      makeWallet('e-wallet', 'e_wallet', -100_000),
      makeWallet('card', 'credit_card', -500_000),
    ]);

    expect(summary).toEqual({
      totalNonCreditCardWalletBalance: 900_000,
      totalAssets: 1_000_000,
      totalCreditCardLiability: 500_000,
      totalBalance: 500_000,
    });
  });

  it('excludes opted-out regular wallets and credit cards from every total', () => {
    const summary = buildWalletBalanceSummary([
      makeWallet('excluded-bank', 'bank', 10_000_000, 1),
      makeWallet('cash', 'cash', 1_000_000),
      makeWallet('excluded-card', 'credit_card', -300_000, 1),
    ]);

    expect(summary).toEqual({
      totalNonCreditCardWalletBalance: 1_000_000,
      totalAssets: 1_000_000,
      totalCreditCardLiability: 0,
      totalBalance: 1_000_000,
    });
  });
});
