import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  getCreateTransactionInitialValues,
  getDefaultCreateTransactionValues,
  getEditTransactionInitialValues,
  useTransactionForm,
} from '../modules/transactions/hooks/useTransactionForm';
import { createTransactionUseCase } from '@/core/di/transactions.di';

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
      receipt_path: undefined,
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

  it('does not reuse legacy last successful create values on new create', () => {
    localStorage.setItem('transaction_last_successful_create', JSON.stringify({
      type: 'transfer',
      wallet_id: 'wallet-1',
      to_wallet_id: 'wallet-2',
      category_id: 'cat-transfer',
      amount: 125000,
      note: 'Monthly card payment',
      transaction_date: 1717200000000,
      receipt_path: 'receipts/old.jpg',
    }));

    expect(getCreateTransactionInitialValues()).toEqual({
      type: 'expense',
      amount: 0,
      category_id: '',
      wallet_id: '',
      note: '',
      transaction_date: Date.now(),
      receipt_path: undefined,
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
      receipt_path: 'receipts/salary.jpg',
    }));

    expect(getCreateTransactionInitialValues()).toEqual({
      type: 'expense',
      amount: 0,
      category_id: '',
      wallet_id: '',
      note: '',
      transaction_date: Date.now(),
      receipt_path: undefined,
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
      receipt_path: 'receipts/salary.jpg',
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
    expect(localStorage.getItem('transaction_draft')).toBeNull();
    expect(localStorage.getItem('transaction_last_successful_create')).toBeNull();
    expect(result.current.formData).toEqual({
      type: 'expense',
      amount: 0,
      category_id: '',
      wallet_id: '',
      note: '',
      transaction_date: Date.now(),
      receipt_path: undefined,
    });
  });

  it('keeps edit mode initialized from the existing transaction', () => {
    expect(getEditTransactionInitialValues({
      id: 'tx-1',
      type: 'income',
      amount: 750000,
      category_id: 'cat-salary',
      wallet_id: 'wallet-bank',
      to_wallet_id: null,
      note: 'Salary',
      transaction_date: 1717200000000,
      receipt_path: 'receipts/salary.jpg',
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
      receipt_path: 'receipts/salary.jpg',
    });
  });
});
