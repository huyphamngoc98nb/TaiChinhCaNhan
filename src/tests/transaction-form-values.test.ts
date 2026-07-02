import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  getCreateTransactionInitialValues,
  getDefaultCreateTransactionValues,
  getEditTransactionInitialValues,
  useTransactionForm,
} from '../modules/transactions/hooks/useTransactionForm';
import { createTransactionUseCase } from '@/core/di/transactions.di';
import {
  TRANSACTION_INPUT_SETTINGS_STORAGE_KEY,
  getTransactionInputSettings,
  updateTransactionInputSettings,
} from '@/modules/settings/services/transaction-input-settings.service';

const mocks = vi.hoisted(() => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  getDbConnection: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/core/db/sqlite/connection', () => ({
  getDbConnection: mocks.getDbConnection,
}));

vi.mock('@/core/di/transactions.di', () => ({
  createTransactionUseCase: { execute: mocks.createTransaction },
  updateTransactionUseCase: { execute: mocks.updateTransaction },
}));

vi.mock('@/shared/components/Toast/ToastContext', () => ({
  useToast: () => ({
    success: mocks.toastSuccess,
    error: mocks.toastError,
  }),
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe('transaction create form values', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T10:00:00Z'));
    localStorage.clear();
    mocks.createTransaction.mockResolvedValue(undefined);
    mocks.updateTransaction.mockResolvedValue(undefined);
    mocks.getDbConnection.mockResolvedValue({
      query: vi.fn(async (sql: string) => ({
        values: sql.includes('FROM wallets')
          ? [{ id: 'wallet-default', name: 'Cash', account_type: 'cash', balance: 100000 }]
          : sql.includes('FROM budgets')
            ? []
            : [{ id: 'cat-food', name: 'Food', type: 'expense' }],
      })),
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('builds clean default values for successful create reset', () => {
    expect(getDefaultCreateTransactionValues()).toEqual({
      type: 'expense',
      amount: 0,
      category_id: '',
      wallet_id: '',
      note: '',
      transaction_date: Date.now(),
      is_budget_offset: false,
      offset_budget_id: null,
    });
  });

  it('does not auto-select the first wallet when creating a transaction', async () => {
    const { result } = renderHook(() => useTransactionForm());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.options.wallets).toHaveLength(1);
    expect(result.current.formData.wallet_id).toBe('');
  });

  it('builds create defaults from configured type and last used date', () => {
    updateTransactionInputSettings({
      defaultTransactionType: 'transfer',
      defaultDateMode: 'last_used',
      lastUsedTransactionDate: 1_717_200_000_000,
    });

    expect(getDefaultCreateTransactionValues()).toEqual({
      type: 'transfer',
      amount: 0,
      category_id: 'cat-transfer',
      wallet_id: '',
      note: '',
      transaction_date: 1_717_200_000_000,
      is_budget_offset: false,
      offset_budget_id: null,
    });
  });

  it('falls back to today when last used date storage is invalid', () => {
    localStorage.setItem(TRANSACTION_INPUT_SETTINGS_STORAGE_KEY, JSON.stringify({
      defaultDateMode: 'last_used',
      lastUsedTransactionDate: 'invalid-date',
    }));

    expect(getDefaultCreateTransactionValues()).toMatchObject({
      type: 'expense',
      category_id: '',
      wallet_id: '',
      transaction_date: Date.now(),
    });
  });

  it('applies a configured default wallet only when it is still available', async () => {
    updateTransactionInputSettings({ defaultWalletId: 'wallet-default' });

    const { result } = renderHook(() => useTransactionForm());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.options.wallets).toHaveLength(1);
    expect(result.current.formData.wallet_id).toBe('wallet-default');
  });

  it('keeps wallet empty when the configured default wallet is no longer valid', async () => {
    updateTransactionInputSettings({ defaultWalletId: 'wallet-missing' });

    const { result } = renderHook(() => useTransactionForm());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.options.wallets).toHaveLength(1);
    expect(result.current.formData.wallet_id).toBe('');
  });

  it('does not reuse legacy last successful create values on new create', () => {
    localStorage.setItem('transaction_last_successful_create', JSON.stringify({
      type: 'transfer',
      wallet_id: 'wallet-1',
      to_wallet_id: 'wallet-2',
      category_id: 'cat-transfer',
      amount: 125000,
      note: 'Monthly card payment',
      transaction_date: 1717200000000,
    }));

    expect(getCreateTransactionInitialValues()).toEqual({
      type: 'expense',
      amount: 0,
      category_id: '',
      wallet_id: '',
      note: '',
      transaction_date: Date.now(),
      is_budget_offset: false,
      offset_budget_id: null,
    });
    expect(localStorage.getItem('transaction_last_successful_create')).toBeNull();
  });

  it('does not reuse stale persisted draft values on new create', () => {
    localStorage.setItem('transaction_draft', JSON.stringify({
      type: 'income',
      wallet_id: 'wallet-bank',
      category_id: 'cat-salary',
      amount: 750000,
      note: 'Previous successful salary',
      transaction_date: 1717200000000,
    }));

    expect(getCreateTransactionInitialValues()).toEqual({
      type: 'expense',
      amount: 0,
      category_id: '',
      wallet_id: '',
      note: '',
      transaction_date: Date.now(),
      is_budget_offset: false,
      offset_budget_id: null,
    });
    expect(localStorage.getItem('transaction_draft')).toBeNull();
  });

  it('successful create clears stale create storage and resets mounted create state', async () => {
    const { result } = renderHook(() => useTransactionForm());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.options.wallets).toHaveLength(1);

    localStorage.setItem('transaction_draft', JSON.stringify({
      type: 'income',
      wallet_id: 'wallet-bank',
      category_id: 'cat-salary',
      amount: 750000,
      note: 'Previous successful salary',
      transaction_date: 1717200000000,
    }));

    act(() => {
      result.current.setFormData({
        type: 'expense',
        wallet_id: 'wallet-default',
        category_id: 'cat-food',
        amount: 120000,
        note: 'Lunch',
        transaction_date: 1717200000000,
      });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(createTransactionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(getTransactionInputSettings().lastUsedTransactionDate).toBe(1717200000000);
    expect(localStorage.getItem('transaction_draft')).toBeNull();
    expect(localStorage.getItem('transaction_last_successful_create')).toBeNull();
    expect(result.current.formData).toEqual({
      type: 'expense',
      amount: 0,
      category_id: '',
      wallet_id: '',
      note: '',
      transaction_date: Date.now(),
      is_budget_offset: false,
      offset_budget_id: null,
    });
  });

  it('successful create in last-used mode saves the date and resets to it', async () => {
    updateTransactionInputSettings({
      defaultDateMode: 'last_used',
      lastUsedTransactionDate: 1_717_100_000_000,
    });
    const { result } = renderHook(() => useTransactionForm());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    localStorage.setItem('transaction_draft', JSON.stringify({
      type: 'income',
      wallet_id: 'wallet-bank',
      category_id: 'cat-salary',
      amount: 750000,
      note: 'Stale draft',
      transaction_date: 1717100000000,
    }));

    act(() => {
      result.current.setFormData({
        type: 'expense',
        wallet_id: 'wallet-default',
        category_id: 'cat-food',
        amount: 120000,
        note: 'Lunch',
        transaction_date: 1_717_200_000_000,
      });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(createTransactionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(getTransactionInputSettings().lastUsedTransactionDate).toBe(1_717_200_000_000);
    expect(localStorage.getItem('transaction_draft')).toBeNull();
    expect(localStorage.getItem('transaction_last_successful_create')).toBeNull();
    expect(result.current.formData).toEqual({
      type: 'expense',
      amount: 0,
      category_id: '',
      wallet_id: '',
      note: '',
      transaction_date: 1_717_200_000_000,
      is_budget_offset: false,
      offset_budget_id: null,
    });
  });

  it('does not save an invalid create date as last used date', async () => {
    updateTransactionInputSettings({
      defaultDateMode: 'last_used',
      lastUsedTransactionDate: 1_717_100_000_000,
    });
    const { result } = renderHook(() => useTransactionForm());

    act(() => {
      result.current.setFormData({
        type: 'expense',
        wallet_id: 'wallet-default',
        category_id: 'cat-food',
        amount: 120000,
        note: 'Lunch',
        transaction_date: Number.NaN,
      });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(createTransactionUseCase.execute).toHaveBeenCalledTimes(1);
    expect(getTransactionInputSettings().lastUsedTransactionDate).toBe(1_717_100_000_000);
  });

  it('does not save last used date when editing a transaction', async () => {
    updateTransactionInputSettings({
      defaultDateMode: 'last_used',
      lastUsedTransactionDate: 1_717_100_000_000,
    });
    const existingTransaction = {
      id: 'tx-1',
      type: 'income' as const,
      amount: 750000,
      category_id: 'cat-salary',
      wallet_id: 'wallet-bank',
      to_wallet_id: null,
      note: 'Salary',
      transaction_date: 1_717_150_000_000,
      exclude_from_total: false,
      created_at: 1_717_150_000_000,
      updated_at: 1_717_150_000_000,
      deleted_at: null,
    };
    const { result } = renderHook(() => useTransactionForm(existingTransaction));

    act(() => {
      result.current.setFormData({
        ...result.current.formData,
        transaction_date: 1_717_300_000_000,
      });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(mocks.updateTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.createTransaction).not.toHaveBeenCalled();
    expect(getTransactionInputSettings().lastUsedTransactionDate).toBe(1_717_100_000_000);
  });

  it('keeps edit mode initialized from the existing transaction', () => {
    updateTransactionInputSettings({
      defaultWalletId: 'wallet-default',
      defaultTransactionType: 'transfer',
      defaultDateMode: 'last_used',
      lastUsedTransactionDate: 1_717_200_000_000,
    });

    expect(getEditTransactionInitialValues({
      id: 'tx-1',
      type: 'income',
      amount: 750000,
      category_id: 'cat-salary',
      wallet_id: 'wallet-bank',
      to_wallet_id: null,
      note: 'Salary',
      transaction_date: 1717200000000,
      exclude_from_total: false,
      created_at: 1717200000000,
      updated_at: 1717200000000,
      deleted_at: null,
    })).toEqual({
      type: 'income',
      amount: 750000,
      category_id: 'cat-salary',
      wallet_id: 'wallet-bank',
      to_wallet_id: undefined,
      note: 'Salary',
      transaction_date: 1717200000000,
      exclude_from_total: false,
      is_budget_offset: false,
      offset_budget_id: null,
    });
  });
});
