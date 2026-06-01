import { describe, expect, it, vi } from 'vitest';
import type { LoanWithSummary } from '../domain/loan.model';
import type { ILoanRepository } from '../repositories/loan.repository';
import { deleteLoan, LoanHasPaymentsError } from './delete-loan';

function loan(overrides: Partial<LoanWithSummary> = {}): LoanWithSummary {
  return {
    id: 'loan-1',
    wallet_id: 'wallet-1',
    skip_transaction: false,
    type: 'lend',
    contact_name: 'Nguyen Van A',
    contact_info: null,
    principal: 1_000_000,
    due_date: null,
    note: null,
    status: 'active',
    created_at: 0,
    updated_at: 0,
    deleted_at: null,
    paid_amount: 0,
    remaining: 1_000_000,
    ...overrides,
  };
}

function makeRepo(overrides: Partial<ILoanRepository> = {}): ILoanRepository {
  return {
    createLoan: vi.fn(),
    getLoanById: vi.fn(async () => loan()),
    listLoans: vi.fn(async () => []),
    updateLoanStatus: vi.fn(),
    softDeleteLoan: vi.fn(async () => true),
    hardDeleteLoan: vi.fn(async () => true),
    createPayment: vi.fn(),
    listPayments: vi.fn(),
    getTotalPaid: vi.fn(async () => 0),
    ...overrides,
  };
}

describe('deleteLoan', () => {
  it('soft deletes an existing loan', async () => {
    const repo = makeRepo();

    await deleteLoan('loan-1', 'soft', { loanRepo: repo });

    expect(repo.softDeleteLoan).toHaveBeenCalledWith('loan-1', expect.any(Number));
    expect(repo.hardDeleteLoan).not.toHaveBeenCalled();
  });

  it('hard deletes a loan with no payments', async () => {
    const repo = makeRepo();

    await deleteLoan('loan-1', 'hard', { loanRepo: repo });

    expect(repo.getTotalPaid).toHaveBeenCalledWith('loan-1');
    expect(repo.hardDeleteLoan).toHaveBeenCalledWith('loan-1');
  });

  it('blocks hard delete when payments exist', async () => {
    const repo = makeRepo({
      getTotalPaid: vi.fn(async () => 250_000),
    });

    await expect(deleteLoan('loan-1', 'hard', { loanRepo: repo }))
      .rejects.toThrow(LoanHasPaymentsError);

    expect(repo.hardDeleteLoan).not.toHaveBeenCalled();
  });

  it('force hard deletes a loan with payments', async () => {
    const repo = makeRepo({
      getTotalPaid: vi.fn(async () => 250_000),
    });

    await deleteLoan('loan-1', 'hard', { loanRepo: repo }, { force: true });

    expect(repo.hardDeleteLoan).toHaveBeenCalledWith('loan-1');
  });

  it('can delete a hidden loan by falling back to includeDeleted list', async () => {
    const repo = makeRepo({
      getLoanById: vi.fn(async () => null),
      listLoans: vi.fn(async () => [loan({ deleted_at: 123 })]),
    });

    await deleteLoan('loan-1', 'hard', { loanRepo: repo });

    expect(repo.listLoans).toHaveBeenCalledWith({ includeDeleted: true });
    expect(repo.hardDeleteLoan).toHaveBeenCalledWith('loan-1');
  });
});
