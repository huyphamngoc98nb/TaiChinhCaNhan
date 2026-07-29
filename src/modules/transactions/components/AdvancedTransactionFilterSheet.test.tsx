import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Category } from '@/modules/categories/domain/category.model';
import type { Wallet } from '@/modules/wallets/repositories/sqlite-wallet.repository';
import {
  AdvancedTransactionFilterSheet,
  endOfLocalDay,
  startOfLocalDay,
} from './AdvancedTransactionFilterSheet';

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/components/BottomSheet', () => ({
  BottomSheet: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => (
    isOpen ? <div>{children}</div> : null
  ),
}));

vi.mock('@/shared/components/ImeTextInput', () => ({
  ImeTextInput: ({
    value,
    onValueChange,
    ...props
  }: {
    value: string;
    onValueChange: (value: string) => void;
    [key: string]: unknown;
  }) => (
    <input
      {...props}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
}));

vi.mock('@/shared/components/DropdownList', () => ({
  DropdownList: ({
    value,
    onChange,
    ariaLabel,
    options,
  }: {
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
    options: { value: string; label: ReactNode }[];
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const wallets = [
  { id: 'wallet-1', name: 'Cash' },
] as Wallet[];

const categories = [
  { id: 'expense-food', name: 'Food', type: 'expense' },
  { id: 'income-salary', name: 'Salary', type: 'income' },
] as Category[];

function renderSheet(overrides: Partial<Parameters<typeof AdvancedTransactionFilterSheet>[0]> = {}) {
  const props: Parameters<typeof AdvancedTransactionFilterSheet>[0] = {
    id: 'filter-sheet',
    isOpen: true,
    filter: {
      wallet_id: 'wallet-1',
      type: 'expense',
      category_id: 'expense-food',
      note: 'lunch',
      startDate: new Date(2026, 6, 1).getTime(),
      endDate: new Date(2026, 6, 31, 23, 59, 59, 999).getTime(),
    },
    wallets,
    categories,
    onApply: vi.fn(),
    onResetDraft: vi.fn(() => ({
      startDate: new Date(2026, 6, 1).getTime(),
      endDate: new Date(2026, 6, 31, 23, 59, 59, 999).getTime(),
    })),
    onClose: vi.fn(),
    ...overrides,
  };

  render(<AdvancedTransactionFilterSheet {...props} />);
  return props;
}

describe('AdvancedTransactionFilterSheet', () => {
  it('keeps edits in a local draft until Apply is pressed', () => {
    const props = renderSheet();

    fireEvent.change(
      screen.getByPlaceholderText('transactions.search_note_placeholder'),
      { target: { value: 'coffee' } },
    );

    expect(props.onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('transactions.filter_apply'));

    expect(props.onApply).toHaveBeenCalledTimes(1);
    expect(props.onApply).toHaveBeenCalledWith(expect.objectContaining({ note: 'coffee' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('resets only the draft and waits for Apply before committing', () => {
    const props = renderSheet();

    fireEvent.click(screen.getByText('transactions.reset_filters'));

    expect(props.onApply).not.toHaveBeenCalled();
    expect((screen.getByLabelText('transactions.wallet') as HTMLSelectElement).value).toBe('');

    fireEvent.click(screen.getByText('transactions.filter_apply'));

    expect(props.onApply).toHaveBeenCalledWith({
      startDate: new Date(2026, 6, 1).getTime(),
      endDate: new Date(2026, 6, 31, 23, 59, 59, 999).getTime(),
    });
  });

  it('clears a category that is invalid after the transaction type changes', () => {
    renderSheet();

    fireEvent.change(screen.getByLabelText('transactions.type'), {
      target: { value: 'income' },
    });

    expect((screen.getByLabelText('transactions.category') as HTMLSelectElement).value).toBe('');
    expect(screen.queryByRole('option', { name: 'Food' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Salary' })).toBeTruthy();
  });

  it('keeps date boundaries in local time', () => {
    const start = startOfLocalDay('2026-07-15');
    const end = endOfLocalDay('2026-07-15');

    expect(new Date(start as number)).toEqual(new Date(2026, 6, 15, 0, 0, 0, 0));
    expect(new Date(end as number)).toEqual(new Date(2026, 6, 15, 23, 59, 59, 999));
  });
});
