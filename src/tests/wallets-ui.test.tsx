import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WalletList } from '@/modules/wallets/components/WalletList';
import { CurrencyProvider } from '@/shared/context/CurrencyContext';
import { LanguageProvider } from '@/shared/context/LanguageContext';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: 'vi' })),
    set: vi.fn(async () => undefined),
  },
}));

function wallet(overrides: Partial<Wallet>): Wallet {
  return {
    id: 'wallet-id',
    name: 'Wallet',
    currency: 'VND',
    balance: 0,
    account_type: 'cash',
    icon: null,
    color: null,
    sort_order: 0,
    is_active: 1,
    exclude_from_total: 0,
    credit_limit: null,
    statement_day: null,
    due_day: null,
    annual_fee: null,
    created_at: 0,
    updated_at: 0,
    ...overrides,
  };
}

function renderWalletList(wallets: Wallet[]) {
  return render(
    <LanguageProvider>
      <CurrencyProvider>
        <WalletList
          wallets={wallets}
          totalBalance={100000}
          loading={false}
          error={null}
        />
      </CurrencyProvider>
    </LanguageProvider>,
  );
}

describe('WalletList', () => {
  it('shows active wallets even when their balance is zero', async () => {
    renderWalletList([
      wallet({ id: 'cash', name: 'Cash', balance: 100000 }),
      wallet({ id: 'zero', name: 'Zero balance', balance: 0 }),
      wallet({ id: 'string-zero', name: 'String zero balance', balance: '0' as unknown as number }),
      wallet({ id: 'inactive', name: 'Inactive wallet', balance: 50000, is_active: 0 }),
    ]);

    expect(await screen.findByText('Cash')).toBeTruthy();
    expect(await screen.findByText('Zero balance')).toBeTruthy();
    expect(await screen.findByText('String zero balance')).toBeTruthy();
    expect(screen.queryByText('Inactive wallet')).toBeNull();
  });
});
