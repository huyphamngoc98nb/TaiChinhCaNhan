import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoanListPage } from '@/modules/loans/pages/LoanListPage';
import { LanguageProvider } from '@/shared/context/LanguageContext';

const mocks = vi.hoisted(() => ({
  createLoan: vi.fn(),
  deleteLoan: vi.fn(),
  reload: vi.fn(),
  toastSuccess: vi.fn(),
  useLoansFilter: vi.fn(),
}));

vi.mock('@/shared/components/BackButton', () => ({
  BackButton: () => null,
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: 'vi' })),
    set: vi.fn(async () => undefined),
  },
}));

vi.mock('@/shared/components/BottomSheet', () => ({
  BottomSheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/components/ConfirmDialog/ConfirmContext', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
}));

vi.mock('@/shared/components/Toast/ToastContext', () => ({
  useToast: () => ({
    success: mocks.toastSuccess,
    error: vi.fn(),
    info: vi.fn(),
    showToast: vi.fn(),
  }),
}));

vi.mock('@/modules/loans/components/LoanCard', () => ({
  LoanCard: () => null,
}));

vi.mock('@/modules/loans/components/LoanForm', () => ({
  LoanForm: ({ onSubmit }: { onSubmit: (input: Record<string, unknown>) => Promise<void> }) => (
    <button
      type="button"
      onClick={() => void onSubmit({
        type: 'lend',
        contact_name: 'Nguyen Van A',
        principal: 1_000_000,
        wallet_id: null,
        skip_transaction: true,
      })}
    >
      Submit loan
    </button>
  ),
}));

vi.mock('@/modules/loans/hooks/useLoans', () => ({
  useLoans: (filter: Record<string, unknown>) => {
    mocks.useLoansFilter(filter);
    return {
      loans: [],
      loading: false,
      error: null,
      reload: mocks.reload,
    };
  },
}));

vi.mock('@/modules/loans/hooks/useLoanMutations', () => ({
  useLoanMutations: () => ({
    createLoan: mocks.createLoan,
    deleteLoan: mocks.deleteLoan,
    loading: false,
  }),
}));

describe('LoanListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createLoan.mockResolvedValue({ id: 'loan-1' });
    mocks.reload.mockResolvedValue(undefined);
  });

  it('shows a success toast after creating a loan', async () => {
    render(
      <MemoryRouter initialEntries={['/loans/new']}>
        <LanguageProvider>
          <LoanListPage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Submit loan' }));

    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Đã thêm khoản vay.'));
    expect(mocks.createLoan).toHaveBeenCalledTimes(1);
    expect(mocks.reload).toHaveBeenCalledTimes(1);
  });

  it('uses newest loan date sorting by default and lets the user choose oldest first', async () => {
    render(
      <MemoryRouter initialEntries={['/loans']}>
        <LanguageProvider>
          <LoanListPage />
        </LanguageProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.useLoansFilter).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 'loanDateDesc' }),
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Sắp xếp' }));
    fireEvent.click(screen.getByRole('option', { name: 'Thời gian vay xa nhất' }));

    await waitFor(() => expect(mocks.useLoansFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortOrder: 'loanDateAsc' }),
    ));
  });
});
