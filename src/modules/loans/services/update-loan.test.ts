import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import type { Loan, UpdateLoanInput } from '../domain/loan.model';
import { LoanValidationError } from '../domain/loan.schema';
import type { ILoanRepository } from '../repositories/loan.repository';
import { updateLoan, type UpdateLoanDeps } from './update-loan';

const wallet: Wallet = {
  id: 'wallet-1',
  name: 'Cash',
  currency: 'VND',
  balance: 10_000_000,
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
};

function input(overrides: Partial<UpdateLoanInput> = {}): UpdateLoanInput {
  return {
    wallet_id: wallet.id,
    skip_transaction: false,
    type: 'lend',
    contact_name: 'Nguyen Van A',
    principal: 1_000_000,
    ...overrides,
  };
}

function makeLoan(data: Parameters<ILoanRepository['updateLoan']>[1], id = 'loan-1'): Loan {
  return {
    id,
    wallet_id: data.wallet_id ?? null,
    skip_transaction: data.skip_transaction ?? false,
    type: data.type,
    contact_name: data.contact_name,
    contact_info: data.contact_info ?? null,
    principal: data.principal,
    due_date: data.due_date ?? null,
    note: data.note ?? null,
    status: 'active',
    created_at: 0,
    updated_at: data.updated_at,
    deleted_at: null,
  };
}

function makeDeps(walletOverride: Partial<Wallet> | null = wallet) {
  const loanUpdateLoan = vi.fn(
    async (id: string, data: Parameters<ILoanRepository['updateLoan']>[1]) =>
      makeLoan(data, id),
  );
  const walletGetById = vi.fn(async () => walletOverride);

  const deps: UpdateLoanDeps = {
    loanRepo: {
      createLoan: vi.fn(),
      updateLoan: loanUpdateLoan,
      getLoanById: vi.fn(),
      listLoans: vi.fn(),
      updateLoanStatus: vi.fn(),
      softDeleteLoan: vi.fn(),
      hardDeleteLoan: vi.fn(),
      createPayment: vi.fn(),
      listPayments: vi.fn(),
      getTotalPaid: vi.fn(),
    },
    walletRepo: {
      getById: walletGetById,
    } as unknown as UpdateLoanDeps['walletRepo'],
  };

  return { deps, loanUpdateLoan, walletGetById };
}

describe('updateLoan', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates a loan without requiring a wallet when skip_transaction is true', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const { deps, loanUpdateLoan, walletGetById } = makeDeps();

    const loan = await updateLoan('loan-1', input({
      wallet_id: null,
      skip_transaction: true,
    }), deps);

    expect(walletGetById).not.toHaveBeenCalled();
    expect(loanUpdateLoan).toHaveBeenCalledWith('loan-1', expect.objectContaining({
      wallet_id: null,
      skip_transaction: true,
      updated_at: 123,
    }));
    expect(loan).toEqual(expect.objectContaining({
      wallet_id: null,
      skip_transaction: true,
    }));
  });

  it('validates wallet when skip_transaction is false', async () => {
    const { deps, walletGetById } = makeDeps();

    await updateLoan('loan-1', input(), deps);

    expect(walletGetById).toHaveBeenCalledWith(wallet.id);
  });

  it('throws validation error when wallet is missing and skip_transaction is false', async () => {
    const { deps, loanUpdateLoan } = makeDeps();

    await expect(updateLoan('loan-1', input({ wallet_id: null }), deps))
      .rejects.toThrow(LoanValidationError);

    expect(loanUpdateLoan).not.toHaveBeenCalled();
  });

  it('throws when the selected wallet is inactive', async () => {
    const { deps, loanUpdateLoan } = makeDeps({ ...wallet, is_active: 0 });

    await expect(updateLoan('loan-1', input(), deps)).rejects.toThrow('Wallet is inactive');

    expect(loanUpdateLoan).not.toHaveBeenCalled();
  });
});
