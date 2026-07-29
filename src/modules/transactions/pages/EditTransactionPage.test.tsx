import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Transaction } from '../domain/transaction.model';
import { EditTransactionPage } from './EditTransactionPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getById: vi.fn(),
  executeDelete: vi.fn(),
  confirm: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  warningHaptic: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ id: 'tx-1' }),
}));

vi.mock('@/shared/components/BackButton', () => ({
  BackButton: ({ onClick, ariaLabel }: { onClick: () => void; ariaLabel: string }) => (
    <button type="button" onClick={onClick} aria-label={ariaLabel}>Back</button>
  ),
}));

vi.mock('@/shared/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/core/repositories/app-repositories', () => ({
  appRepositories: {
    transaction: {
      getById: mocks.getById,
    },
  },
}));

vi.mock('@/core/di/transactions.di', () => ({
  deleteTransactionUseCase: {
    execute: mocks.executeDelete,
  },
}));

vi.mock('@/shared/components/ConfirmDialog/ConfirmContext', () => ({
  useConfirm: () => ({ confirm: mocks.confirm }),
}));

vi.mock('@/shared/components/Toast/ToastContext', () => ({
  useToast: () => ({
    success: mocks.toastSuccess,
    error: mocks.toastError,
  }),
}));

vi.mock('../services/transaction-error-messages', () => ({
  localizeTransactionError: () => 'localized error',
}));

vi.mock('@/shared/utils/haptics', () => ({
  triggerWarningHaptic: mocks.warningHaptic,
}));

vi.mock('../components/TransactionForm', () => ({
  TransactionForm: ({
    header,
    onDelete,
    deleting,
  }: {
    header: ReactNode;
    onDelete: () => Promise<void>;
    deleting: boolean;
  }) => (
    <div>
      {header}
      <span data-testid="deleting">{String(deleting)}</span>
      <button type="button" onClick={() => void onDelete()}>Delete from form</button>
    </div>
  ),
}));

const transaction: Transaction = {
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

describe('EditTransactionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.executeDelete.mockResolvedValue(undefined);
  });

  it('shows a structured loading state, then a not-found recovery action', async () => {
    mocks.getById.mockResolvedValue(null);

    render(<EditTransactionPage />);

    expect(screen.getByText('transactions.loading_detail')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('transactions.not_found_title')).toBeTruthy());

    fireEvent.click(screen.getByText('transactions.back_to_history'));
    expect(mocks.navigate).toHaveBeenCalledWith('/transactions');
  });

  it('distinguishes a load failure from a missing transaction', async () => {
    mocks.getById.mockRejectedValue(new Error('database unavailable'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<EditTransactionPage />);

    await waitFor(() => expect(screen.getByText('transactions.load_error_title')).toBeTruthy());
    expect(screen.getByText('transactions.load_error_hint')).toBeTruthy();
    consoleError.mockRestore();
  });

  it('keeps confirmation, delete use case, feedback and navigation in the delete flow', async () => {
    mocks.getById.mockResolvedValue(transaction);

    render(<EditTransactionPage />);

    await waitFor(() => expect(screen.getByText('Delete from form')).toBeTruthy());
    fireEvent.click(screen.getByText('Delete from form'));

    await waitFor(() => expect(mocks.executeDelete).toHaveBeenCalledWith('tx-1'));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.warningHaptic).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('transactions.delete_success');
    expect(mocks.navigate).toHaveBeenCalledWith('/transactions');
  });
});
