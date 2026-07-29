/// <reference types="node" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  setFormData: vi.fn(),
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
  FormTransition: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock('@/shared/components/DropdownList', () => ({
  DropdownList: ({
    options,
  }: {
    options: Array<{ value: string; label: string }>;
  }) => (
    <div data-testid="dropdown-list">
      {options.map(option => <span key={option.value}>{option.label}</span>)}
    </div>
  ),
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

function mockTransactionFormState(
  overrides: Partial<Transaction> = {},
  optionOverrides: {
    wallets?: unknown[];
    categories?: unknown[];
    budgets?: unknown[];
    submitting?: boolean;
  } = {},
) {
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
    setFormData: mocks.setFormData,
    save: mocks.save,
    submitting: optionOverrides.submitting ?? false,
    options: {
      wallets: optionOverrides.wallets ?? [],
      categories: optionOverrides.categories ?? [],
      budgets: optionOverrides.budgets ?? [],
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

  it('changes transaction type exactly once for a touch interaction', () => {
    render(<TransactionForm onSuccess={vi.fn()} />);

    const incomeButton = screen.getByRole('button', { name: 'form.type_income' });
    fireEvent.pointerDown(incomeButton, { pointerType: 'touch' });
    fireEvent.click(incomeButton);

    expect(mocks.setFormData).toHaveBeenCalledTimes(1);
    expect(mocks.setFormData).toHaveBeenCalledWith(expect.objectContaining({
      type: 'income',
      category_id: '',
    }));
  });

  it('guards the duplicate check and save against rapid repeated submits', async () => {
    updateTransactionInputSettings({ duplicateWarningEnabled: true });
    let resolveDuplicate: ((value: null) => void) | undefined;
    mocks.findDuplicateTransaction.mockImplementation(() => new Promise<null>((resolve) => {
      resolveDuplicate = resolve;
    }));
    mockTransactionFormState({
      amount: 50_000,
      wallet_id: 'wallet-1',
      category_id: 'cat-food',
      transaction_date: 1_717_200_000_000,
    });

    const { container } = render(<TransactionForm onSuccess={vi.fn()} />);
    const form = container.querySelector('form') as HTMLFormElement;

    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(mocks.findDuplicateTransaction).toHaveBeenCalledTimes(1);
    resolveDuplicate?.(null);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
  });

  it('keeps the save action inside the form content flow and outside the sticky header', () => {
    const { container } = render(
      <TransactionForm
        header={<h1>Transaction header</h1>}
        pinTypeSelector
        onSuccess={vi.fn()}
      />,
    );

    const content = container.querySelector('.transaction-form-content');
    const actions = container.querySelector('.transaction-form__actions');
    const stickyShell = container.querySelector('.transaction-form-sticky-shell');
    const saveButton = screen.getByRole('button', { name: 'form.save' });

    expect(content?.contains(saveButton)).toBe(true);
    expect(actions?.contains(saveButton)).toBe(true);
    expect(stickyShell?.contains(saveButton)).toBe(false);

    const forbiddenClasses = ['sticky', 'fixed', 'bottom-0', 'inset-x-0'];
    const actionClasses = actions?.className.split(/\s+/) ?? [];
    const saveClasses = saveButton.className.split(/\s+/);
    forbiddenClasses.forEach((className) => {
      expect(actionClasses).not.toContain(className);
      expect(saveClasses).not.toContain(className);
    });
  });

  it('keeps fields, report options, save, and delete in DOM order in edit mode', () => {
    mockTransactionFormState(existingTransaction);

    const { container } = render(
      <TransactionForm
        existing={existingTransaction}
        header={<h1>Transaction header</h1>}
        pinTypeSelector
        onSuccess={vi.fn()}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    const content = container.querySelector('.transaction-form-content') as HTMLElement;
    const primaryFields = content.querySelector('#transaction-primary-heading') as HTMLElement;
    const reportOptions = content.querySelector('#transaction-report-heading') as HTMLElement;
    const saveButton = screen.getByRole('button', { name: 'form.save' });
    const deleteButton = screen.getByRole('button', {
      name: 'transactions.delete_confirm_btn',
    });
    const stickyShell = container.querySelector('.transaction-form-sticky-shell');

    expect(primaryFields.compareDocumentPosition(reportOptions)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(reportOptions.compareDocumentPosition(saveButton)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(saveButton.compareDocumentPosition(deleteButton)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(content.contains(saveButton)).toBe(true);
    expect(content.contains(deleteButton)).toBe(true);
    expect(content.querySelector('.transaction-form__actions')?.contains(deleteButton)).toBe(true);
    expect(stickyShell?.contains(deleteButton)).toBe(false);
  });

  it('blurs the focused note and submits exactly once from one save click', async () => {
    updateTransactionInputSettings({ duplicateWarningEnabled: false });
    const onSuccess = vi.fn();

    render(<TransactionForm onSuccess={onSuccess} />);

    const noteInput = screen.getByRole('textbox', { name: 'note' });
    const blurSpy = vi.spyOn(noteInput, 'blur');
    noteInput.focus();

    fireEvent.click(screen.getByRole('button', { name: 'form.save' }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(blurSpy).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not trigger delete when save is clicked in edit mode', async () => {
    mockTransactionFormState(existingTransaction);
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <TransactionForm
        existing={existingTransaction}
        onSuccess={vi.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'form.save' }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('disables save and delete while the form is submitting', () => {
    mockTransactionFormState(existingTransaction, { submitting: true });

    render(
      <TransactionForm
        existing={existingTransaction}
        onSuccess={vi.fn()}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect((screen.getByRole('button', {
      name: 'form.saving',
    }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', {
      name: 'transactions.delete_confirm_btn',
    }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps the action CSS in normal flow without floating declarations', () => {
    const css = readFileSync(resolve(
      process.cwd(),
      'src/modules/transactions/components/TransactionForm.css',
    ), 'utf8');
    const globalCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    const actionRule = css.match(/\.transaction-form__actions\s*\{([^}]*)\}/)?.[1];
    const saveRule = css.match(/\.transaction-form__save\s*\{([^}]*)\}/)?.[1];

    expect(actionRule).toBeDefined();
    expect(actionRule).toContain('position: static');
    expect(actionRule).not.toMatch(/position:\s*(?:sticky|fixed)/);
    expect(actionRule).not.toMatch(
      /^\s*(?:bottom|inset-block-end|left|right|z-index|transform|backdrop-filter)\s*:/m,
    );
    expect(saveRule).not.toMatch(/position:\s*(?:sticky|fixed)/);
    expect(globalCss).not.toMatch(/\.transaction-form-content\s*\{/);
  });

  it('keeps debt workflow categories out of the manual category picker', () => {
    mockTransactionFormState({}, {
      categories: [
        { id: 'cat-food', name: 'Food', type: 'expense', slug: 'food' },
        { id: 'cat-loan', name: 'Cho vay', type: 'expense', slug: 'cho-vay' },
        { id: 'cat-debt', name: 'Trả nợ', type: 'expense', slug: 'tra-no' },
      ],
    });

    render(<TransactionForm onSuccess={vi.fn()} />);

    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.queryByText('Cho vay')).toBeNull();
    expect(screen.queryByText('Trả nợ')).toBeNull();
  });
});
