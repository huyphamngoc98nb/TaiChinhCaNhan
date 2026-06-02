import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoanForm } from '@/modules/loans/components/LoanForm';
import type { Loan } from '@/modules/loans/domain/loan.model';
import { LanguageProvider } from '@/shared/context/LanguageContext';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async () => ({ value: 'vi' })),
    set: vi.fn(async () => undefined),
  },
}));

vi.mock('@/modules/wallets/hooks/useWallets', () => ({
  useWallets: () => ({
    wallets: [{ id: 'wallet-1', name: 'Cash' }],
    loading: false,
  }),
}));

function renderLoanForm(ui: ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

async function fillRequiredFields() {
  const [contactNameInput] = await screen.findAllByRole('textbox');
  fireEvent.change(contactNameInput, { target: { value: 'Nguyen Van A' } });
  fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000000' } });
}

describe('LoanForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows skipping the opening wallet transaction', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = renderLoanForm(<LoanForm onSubmit={onSubmit} loading={false} />);

    await fillRequiredFields();

    const skipTransaction = screen.getByRole('checkbox', { name: 'Không tạo giao dịch' });
    fireEvent.click(skipTransaction);

    expect((skipTransaction as HTMLInputElement).checked).toBe(true);

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      skip_transaction: true,
      wallet_id: null,
    }));
  });

  it('initializes skip transaction in edit mode', async () => {
    const existingLoan: Loan = {
      id: 'loan-1',
      wallet_id: null,
      skip_transaction: true,
      type: 'borrow',
      contact_name: 'Nguyen Van A',
      contact_info: null,
      principal: 500_000,
      due_date: null,
      note: null,
      status: 'active',
      created_at: 0,
      updated_at: 0,
      deleted_at: null,
    };
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = renderLoanForm(
      <LoanForm initialLoan={existingLoan} onSubmit={onSubmit} loading={false} />
    );

    const skipTransaction = await screen.findByRole('checkbox', { name: 'Không tạo giao dịch' });

    expect((skipTransaction as HTMLInputElement).checked).toBe(true);

    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      skip_transaction: true,
      wallet_id: null,
      type: 'borrow',
      principal: 500_000,
    }));
  });
});
