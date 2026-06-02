import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category } from '@/modules/categories/domain/category.model';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import type { CreateLoanInput, Loan } from '../domain/loan.model';
import { LoanValidationError } from '../domain/loan.schema';
import type { ILoanRepository } from '../repositories/loan.repository';
import { createLoan, type CreateLoanDeps } from './create-loan';

const generateUUIDMock = vi.hoisted(() => vi.fn<() => string>());

vi.mock('@/core/db/transaction-runner', () => ({
  sqliteTransactionRunner: async <T>(work: () => Promise<T>) => work(),
}));

vi.mock('@/shared/utils/generate-uuid', () => ({
  generateUUID: generateUUIDMock,
}));

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

function category(id: string, slug: string, type: Category['type']): Category {
  return {
    id,
    slug,
    name: slug,
    type,
    icon: null,
    color: null,
    description: null,
    is_system: 1,
    created_at: 0,
    updated_at: 0,
  };
}

function makeDeps() {
  const categories: Record<string, Category> = {
    cho_vay: category('cat-cho-vay', 'cho_vay', 'expense'),
    vay_no: category('cat-vay-no', 'vay_no', 'income'),
  };

  const loanCreateLoan = vi.fn(
    async (data: Parameters<ILoanRepository['createLoan']>[0]): Promise<Loan> => ({
      id: data.id,
      wallet_id: data.wallet_id ?? null,
      skip_transaction: data.skip_transaction ?? false,
      linked_transaction_id: data.linked_transaction_id ?? null,
      type: data.type,
      contact_name: data.contact_name,
      contact_info: data.contact_info ?? null,
      principal: data.principal,
      due_date: data.due_date ?? null,
      note: data.note ?? null,
      status: 'active',
      created_at: data.created_at,
      updated_at: data.updated_at,
      deleted_at: null,
    }),
  );

  const loanUpdateLoan = vi.fn(
    async (id: string, data: Parameters<ILoanRepository['updateLoan']>[1]): Promise<Loan> => ({
      id,
      wallet_id: data.wallet_id ?? null,
      skip_transaction: data.skip_transaction ?? false,
      linked_transaction_id: data.linked_transaction_id ?? null,
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
    }),
  );

  const transactionCreate = vi.fn(
    async (data: Parameters<ITransactionRepository['create']>[0]) => ({
      id: data.id,
      wallet_id: data.wallet_id,
      category_id: data.category_id,
      type: data.type,
      amount: data.amount,
      note: data.note ?? null,
      receipt_path: data.receipt_path ?? null,
      to_wallet_id: data.to_wallet_id ?? null,
      transaction_date: data.transaction_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
      deleted_at: null,
    }),
  );

  const deps: CreateLoanDeps = {
    loanRepo: {
      createLoan: loanCreateLoan,
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
    transactionRepo: {
      create: transactionCreate,
      update: vi.fn(),
      softDelete: vi.fn(),
      getById: vi.fn(),
      getByIdIncludeDeleted: vi.fn(),
      list: vi.fn(),
    },
    walletRepo: {
      getById: vi.fn(async () => wallet),
      getAllActive: vi.fn(),
      getActiveCreditCards: vi.fn(),
      getTotalBalance: vi.fn(),
      getCreditCardOutstandingBalance: vi.fn(),
      getCreditCardStatementBalance: vi.fn(),
      getPaidAmountForStatement: vi.fn(),
      upsertCreditCardStatement: vi.fn(),
      getCreditCardAvailableCredit: vi.fn(),
      listUpcomingCreditCardDuePayments: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      getReferenceCounts: vi.fn(),
      delete: vi.fn(),
      updateBalance: vi.fn(),
      updateBalanceDelta: vi.fn(),
    },
    categoryRepo: {
      findBySlug: vi.fn(async (slug: string) => categories[slug] ?? null),
      list: vi.fn(async (type) => Object.values(categories).filter((item) => item.type === type)),
    },
  };

  return { deps, loanCreateLoan, loanUpdateLoan, transactionCreate };
}

function baseInput(type: CreateLoanInput['type']): CreateLoanInput {
  return {
    wallet_id: wallet.id,
    type,
    contact_name: 'Nguyen Van A',
    principal: 1_000_000,
  };
}

describe('createLoan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateUUIDMock.mockReset();
    generateUUIDMock
      .mockReturnValueOnce('loan-id')
      .mockReturnValueOnce('transaction-id');
  });

  it("creates an expense transaction when type='lend'", async () => {
    const { deps, transactionCreate } = makeDeps();

    await createLoan(baseInput('lend'), deps);

    expect(transactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'transaction-id',
        wallet_id: wallet.id,
        category_id: 'cat-cho-vay',
        type: 'expense',
        amount: 1_000_000,
      }),
    );
  });

  it("creates an income transaction when type='borrow'", async () => {
    const { deps, transactionCreate } = makeDeps();

    await createLoan(baseInput('borrow'), deps);

    expect(transactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'transaction-id',
        wallet_id: wallet.id,
        category_id: 'cat-vay-no',
        type: 'income',
        amount: 1_000_000,
      }),
    );
  });

  it('creates a transaction when skip_transaction is false', async () => {
    const { deps, loanCreateLoan, loanUpdateLoan, transactionCreate } = makeDeps();

    const loan = await createLoan({
      ...baseInput('lend'),
      skip_transaction: false,
    }, deps);

    expect(loan).toEqual(expect.objectContaining({
      wallet_id: wallet.id,
      skip_transaction: false,
      linked_transaction_id: 'transaction-id',
    }));
    expect(loanCreateLoan).toHaveBeenCalledWith(expect.objectContaining({
      wallet_id: wallet.id,
      skip_transaction: false,
      linked_transaction_id: null,
    }));
    expect(transactionCreate).toHaveBeenCalledTimes(1);
    expect(loanUpdateLoan).toHaveBeenCalledWith('loan-id', expect.objectContaining({
      linked_transaction_id: 'transaction-id',
    }));
  });

  it('does not require a wallet or create a transaction when skip_transaction is true', async () => {
    const { deps, loanCreateLoan, loanUpdateLoan, transactionCreate } = makeDeps();

    const loan = await createLoan({
      type: 'lend',
      contact_name: 'Nguyen Van A',
      principal: 1_000_000,
      skip_transaction: true,
    }, deps);

    expect(loan).toEqual(expect.objectContaining({
      wallet_id: null,
      skip_transaction: true,
    }));
    expect(deps.walletRepo.getById).not.toHaveBeenCalled();
    expect(deps.categoryRepo.findBySlug).not.toHaveBeenCalled();
    expect(loanCreateLoan).toHaveBeenCalledWith(expect.objectContaining({
      wallet_id: null,
      skip_transaction: true,
    }));
    expect(transactionCreate).not.toHaveBeenCalled();
    expect(loanUpdateLoan).not.toHaveBeenCalled();
  });

  it('defaults skip_transaction to false and creates a transaction when omitted', async () => {
    const { deps, loanCreateLoan, loanUpdateLoan, transactionCreate } = makeDeps();

    const loan = await createLoan(baseInput('lend'), deps);

    expect(loan).toEqual(expect.objectContaining({
      wallet_id: wallet.id,
      skip_transaction: false,
      linked_transaction_id: 'transaction-id',
    }));
    expect(loanCreateLoan).toHaveBeenCalledWith(expect.objectContaining({
      wallet_id: wallet.id,
      skip_transaction: false,
    }));
    expect(transactionCreate).toHaveBeenCalledTimes(1);
    expect(loanUpdateLoan).toHaveBeenCalledWith('loan-id', expect.objectContaining({
      linked_transaction_id: 'transaction-id',
    }));
  });

  it('throws LoanValidationError when wallet is missing and skip_transaction is false', async () => {
    const { deps, loanCreateLoan, transactionCreate } = makeDeps();

    await expect(createLoan({
      type: 'lend',
      contact_name: 'Nguyen Van A',
      principal: 1_000_000,
    }, deps)).rejects.toThrow(LoanValidationError);

    expect(loanCreateLoan).not.toHaveBeenCalled();
    expect(transactionCreate).not.toHaveBeenCalled();
  });

  it('throws LoanValidationError when principal is not greater than 0', async () => {
    const { deps, loanCreateLoan, transactionCreate } = makeDeps();

    await expect(createLoan({ ...baseInput('lend'), principal: 0 }, deps))
      .rejects.toThrow(LoanValidationError);

    expect(loanCreateLoan).not.toHaveBeenCalled();
    expect(transactionCreate).not.toHaveBeenCalled();
  });
});
