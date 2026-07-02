import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetDisplayFormatSettings,
  updateDisplayFormatSettings,
} from '@/modules/settings/services/display-format-settings.service';
import type { Transaction } from '../domain/transaction.model';
import { TransactionItem } from './TransactionItem';

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/context/CurrencyContext', () => ({
  useCurrency: () => ({
    formatAmount: (value: number) => `$${value}`,
  }),
}));

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    wallet_id: 'wallet-1',
    category_id: 'category-1',
    type: 'expense',
    amount: 100,
    note: null,
    to_wallet_id: null,
    exclude_from_total: false,
    transaction_date: new Date(2026, 5, 22, 14, 30).getTime(),
    created_at: 0,
    updated_at: 0,
    deleted_at: null,
    category_name: 'Food',
    ...overrides,
  };
}

describe('TransactionItem display format integration', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDisplayFormatSettings();
  });

  it('shows date using display format settings when showDate is true', () => {
    updateDisplayFormatSettings({ dateFormat: 'yyyy-MM-dd' });

    render(<TransactionItem transaction={transaction()} onSelect={vi.fn()} showDate />);

    expect(screen.getByText('2026-06-22')).toBeTruthy();
  });

  it('shows time using display format settings when showDate is false', () => {
    updateDisplayFormatSettings({ timeFormat: '12h' });

    render(<TransactionItem transaction={transaction()} onSelect={vi.fn()} />);

    expect(screen.getByText('2:30 PM')).toBeTruthy();
  });
});
