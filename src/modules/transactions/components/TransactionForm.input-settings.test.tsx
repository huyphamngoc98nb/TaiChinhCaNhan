import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateTransactionInputSettings } from '@/modules/settings/services/transaction-input-settings.service';
import type { Transaction } from '../domain/transaction.model';
import { TransactionForm } from './TransactionForm';

const mocks = vi.hoisted(() => ({
  useTransactionForm: vi.fn(),
  save: vi.fn(),
  confirm: vi.fn(),
  findDuplicateTransaction: vi.fn(),
}));

vi.mock('../hooks/useTransactionForm', () => ({
  TRANSFER_CATEGORY_ID: 'cat-transfer',
  useTransactionForm: mocks.useTransactionForm,
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/context/CurrencyContext', () => ({
  useCurrency: () => ({
    currency: 'VND',
  }),
}));

vi.mock('@/shared/components/ConfirmDialog/ConfirmContext', () => ({
  useConfirm: () => ({
    confirm: mocks.confirm,
  }),
}));

vi.mock('../services/duplicate-transaction.service', () => ({
  findDuplicateTransaction: mocks.findDuplicateTransaction,
}));

vi.mock('@/shared/components/CurrencyAmountInput', () => ({
  CurrencyAmountInput: ({
    autoFocus,
    enableMoneyKeyboard,
  }: {
    autoFocus?: boolean;
    enableMoneyKeyboard?: boolean;
  }) => (
    <div
      data-testid="amount-input"
      data-auto-focus={String(Boolean(autoFocus))}
      data-enable-money-keyboard={String(Boolean(enableMoneyKeyboard))}
    />
  ),
}));

vi.mock('@/shared/components/DateTimePicker', () => ({
  DateTimePicker: () => <div data-testid="date-picker" />,
}));

vi.mock('@/shared/components/FormTransition', () => ({
  FormTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/components/DropdownList', () => ({
  DropdownList: () => <div data-testid="dropdown-list" />,
}));

vi.mock('@/shared/components/ImeTextInput', () => ({
  ImeTextInput: () => <input aria-label="note" />,
}));

const existingTransaction: Transaction = {
  id: 'tx-1',
  wallet_id: 'wallet-1',
  category_id: 'cat-food',
  type: 'expense',
  amount: 50_000,
  note: null,
  to_wallet_id: null,
  transaction_date: 1_717_200_000_000,
  exclude_from_total: false,
  is_budget_offset: false,
  offset_budget_id: null,
  created_at: 0,
  updated_at: 0,
  deleted_at: null,
};

function mockTransactionFormState(overrides: Partial<Transaction> = {}) {
  mocks.save.mockResolvedValue(true);
  mocks.useTransactionForm.mockReturnValue({
    formData: {
      type: overrides.type ?? 'expense',
      amount: overrides.amount ?? 0,
      category_id: overrides.category_id ?? '',
      wallet_id: overrides.wallet_id ?? '',
      note: overrides.note ?? '',
      transaction_date: overrides.transaction_date ?? Date.now(),
      exclude_from_total: overrides.exclude_from_total ?? false,
      is_budget_offset: overrides.is_budget_offset ?? false,
      offset_budget_id: overrides.offset_budget_id ?? null,
    },
    setFormData: vi.fn(),
    save: mocks.save,
    submitting: false,
    options: {
      wallets: [],
      categories: [],
      budgets: [],
    },
  });
}

describe('TransactionForm input settings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(false);
    mocks.findDuplicateTransaction.mockResolvedValue(null);
    mockTransactionFormState();
  });

  it('passes custom money keyboard and auto focus settings to the amount input in create mode', () => {
    updateTransactionInputSettings({
      enableMoneyKeyboard: false,
      autoFocusAmount: true,
    });

    render(<TransactionForm onSuccess={vi.fn()} />);

    expect(screen.getByTestId('amount-input').getAttribute('data-enable-money-keyboard')).toBe('false');
    expect(screen.getByTestId('amount-input').getAttribute('data-auto-focus')).toBe('true');
  });

  it('does not auto focus the amount input in edit mode', () => {
    updateTransactionInputSettings({
      enableMoneyKeyboard: true,
      autoFocusAmount: true,
    });
    mockTransactionFormState(existingTransaction);

    render(<TransactionForm existing={existingTransaction} onSuccess={vi.fn()} />);

    expect(screen.getByTestId('amount-input').getAttribute('data-enable-money-keyboard')).toBe('true');
    expect(screen.getByTestId('amount-input').getAttribute('data-auto-focus')).toBe('false');
  });

  it('does not check for duplicate transactions when the setting is disabled', async () => {
    updateTransactionInputSettings({ duplicateWarningEnabled: false });
    mockTransactionFormState({
      amount: 50_000,
      wallet_id: 'wallet-1',
      category_id: 'cat-food',
      transaction_date: 1_717_200_000_000,
    });

    const { container } = render(<TransactionForm onSuccess={vi.fn()} />);

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.findDuplicateTransaction).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('allows saving a duplicate transaction when the user confirms', async () => {
    updateTransactionInputSettings({ duplicateWarningEnabled: true });
    mocks.findDuplicateTransaction.mockResolvedValue({ id: 'tx-duplicate' });
    mocks.confirm.mockResolvedValue(true);
    mockTransactionFormState({
      amount: 50_000,
      wallet_id: 'wallet-1',
      category_id: 'cat-food',
      transaction_date: 1_717_200_000_000,
    });

    const { container } = render(<TransactionForm onSuccess={vi.fn()} />);

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(mocks.findDuplicateTransaction).toHaveBeenCalledWith({
      type: 'expense',
      amount: 50_000,
      walletId: 'wallet-1',
      categoryId: 'cat-food',
      transactionDate: 1_717_200_000_000,
    }));
    expect(mocks.confirm).toHaveBeenCalledWith({
      title: 'transactions.duplicate_warning_title',
      message: 'transactions.duplicate_warning_message',
      cancelText: 'transactions.duplicate_warning_cancel',
      confirmText: 'transactions.duplicate_warning_continue',
    });
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
  });

  it('does not check duplicate transactions in edit mode', async () => {
    updateTransactionInputSettings({ duplicateWarningEnabled: true });
    mockTransactionFormState(existingTransaction);

    const { container } = render(
      <TransactionForm existing={existingTransaction} onSuccess={vi.fn()} />
    );

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.findDuplicateTransaction).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
});
