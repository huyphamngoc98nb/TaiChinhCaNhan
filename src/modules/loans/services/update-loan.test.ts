import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Category } from '@/modules/categories/domain/category.model';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { InMemoryTransactionRepository } from '@/tests/fakes/in-memory-transaction.repository';
import { InMemoryWalletRepository } from '@/tests/fakes/in-memory-wallet.repository';
import type { Loan, UpdateLoanInput } from '../domain/loan.model';
import { LoanValidationError } from '../domain/loan.schema';
import type { ILoanRepository } from '../repositories/loan.repository';
import { updateLoan, type UpdateLoanDeps } from './update-loan';

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
  };
}

function makeExistingLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-1',
    wallet_id: wallet.id,
    skip_transaction: false,
    linked_transaction_id: 'tx-existing',
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
    ...overrides,
  };
}

function makeTransaction(data: Parameters<ITransactionRepository['create']>[0]) {
  return {
    id: data.id,
    wallet_id: data.wallet_id,
    category_id: data.category_id,
    type: data.type,
    amount: data.amount,
    note: data.note ?? null,
    to_wallet_id: data.to_wallet_id ?? null,
    exclude_from_total: data.exclude_from_total ?? false,
    transaction_date: data.transaction_date,
    created_at: data.created_at,
    updated_at: data.updated_at,
    deleted_at: null,
  };
}

function makeDeps(
  walletOverride: Partial<Wallet> | null = wallet,
  existingLoan: Loan | null = makeExistingLoan()
) {
  const categories: Record<string, Category> = {
    cho_vay: category('cat-cho-vay', 'cho_vay', 'expense'),
    vay_no: category('cat-vay-no', 'vay_no', 'income'),
  };
  const loanUpdateLoan = vi.fn(
    async (id: string, data: Parameters<ILoanRepository['updateLoan']>[1]) =>
      makeLoan(data, id),
  );
  const loanGetLoanById = vi.fn(async () => existingLoan);
  const walletGetById = vi.fn(async () => walletOverride);
  const walletUpdateBalanceDelta = vi.fn();
  const transactionCreate = vi.fn(async (data: Parameters<ITransactionRepository['create']>[0]) =>
    makeTransaction(data)
  );
  const transactionSoftDelete = vi.fn(async () => true);
  const linkedTransaction = existingLoan?.linked_transaction_id && existingLoan.wallet_id
    ? makeTransaction({
        id: existingLoan.linked_transaction_id,
        wallet_id: existingLoan.wallet_id,
        category_id: existingLoan.type === 'lend' ? 'cat-cho-vay' : 'cat-vay-no',
        type: existingLoan.type === 'lend' ? 'expense' : 'income',
        amount: existingLoan.principal,
        transaction_date: existingLoan.created_at,
        created_at: existingLoan.created_at,
        updated_at: existingLoan.updated_at,
      })
    : null;
  const transactionGetById = vi.fn(async () => linkedTransaction);

  const deps: UpdateLoanDeps = {
    loanRepo: {
      createLoan: vi.fn(),
      updateLoan: loanUpdateLoan,
      getLoanById: loanGetLoanById,
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
      updateBalanceDelta: walletUpdateBalanceDelta,
    } as unknown as UpdateLoanDeps['walletRepo'],
    transactionRepo: {
      create: transactionCreate,
      update: vi.fn(),
      softDelete: transactionSoftDelete,
      getById: transactionGetById,
      getByIdIncludeDeleted: vi.fn(),
      getBySource: vi.fn(),
      list: vi.fn(),
    },
    categoryRepo: {
      findBySlug: vi.fn(async (slug: string) => categories[slug] ?? null),
      list: vi.fn(async (type) => Object.values(categories).filter((item) => item.type === type)),
    },
  };

  return {
    deps,
    loanUpdateLoan,
    loanGetLoanById,
    walletGetById,
    transactionCreate,
    transactionSoftDelete,
    walletUpdateBalanceDelta,
  };
}

describe('updateLoan', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    generateUUIDMock.mockReset();
  });

  it('updates a loan without requiring a wallet when skip_transaction is true', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const { deps, loanUpdateLoan, walletGetById } = makeDeps(wallet, makeExistingLoan({
      wallet_id: null,
      skip_transaction: true,
      linked_transaction_id: null,
    }));

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

  it('soft-deletes the linked transaction when skip_transaction changes from false to true', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(456);
    const {
      deps,
      loanUpdateLoan,
      transactionCreate,
      transactionSoftDelete,
      walletUpdateBalanceDelta,
    } = makeDeps(
      wallet,
      makeExistingLoan({
        skip_transaction: false,
        linked_transaction_id: 'tx-123',
      })
    );

    const loan = await updateLoan('loan-1', input({
      wallet_id: null,
      skip_transaction: true,
    }), deps);

    expect(transactionSoftDelete).toHaveBeenCalledWith('tx-123', 456);
    expect(walletUpdateBalanceDelta).toHaveBeenCalledWith(wallet.id, 1_000_000, 456);
    expect(transactionCreate).not.toHaveBeenCalled();
    expect(loanUpdateLoan).toHaveBeenCalledWith('loan-1', expect.objectContaining({
      wallet_id: null,
      skip_transaction: true,
      linked_transaction_id: null,
      updated_at: 456,
    }));
    expect(loan.linked_transaction_id).toBeNull();
  });

  it('creates an expense transaction and reduces the wallet when enabling transactions for lend', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(789);
    generateUUIDMock.mockReturnValueOnce('tx-new');
    const {
      deps,
      loanUpdateLoan,
      transactionCreate,
      transactionSoftDelete,
      walletUpdateBalanceDelta,
    } = makeDeps(
      wallet,
      makeExistingLoan({
        wallet_id: null,
        skip_transaction: true,
        linked_transaction_id: null,
      })
    );

    const loan = await updateLoan('loan-1', input({
      wallet_id: wallet.id,
      skip_transaction: false,
      loan_date: '2026-01-02',
      due_date: '2026-01-02',
    }), deps);

    expect(transactionSoftDelete).not.toHaveBeenCalled();
    expect(transactionCreate).toHaveBeenCalledTimes(1);
    expect(transactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'tx-new',
      wallet_id: wallet.id,
      category_id: 'cat-cho-vay',
      type: 'expense',
      amount: 1_000_000,
      transaction_date: new Date('2026-01-02T00:00:00').getTime(),
      source_type: 'loan',
      source_id: 'loan-1',
      source_event: 'opening',
    }));
    expect(walletUpdateBalanceDelta).toHaveBeenCalledWith(wallet.id, -1_000_000, 789);
    expect(loanUpdateLoan).toHaveBeenCalledWith('loan-1', expect.objectContaining({
      wallet_id: wallet.id,
      skip_transaction: false,
      linked_transaction_id: 'tx-new',
      updated_at: 789,
    }));
    expect(loan.linked_transaction_id).toBe('tx-new');
  });

  it('creates an income transaction and increases the wallet when enabling transactions for borrow', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(890);
    generateUUIDMock.mockReturnValueOnce('tx-new');
    const {
      deps,
      transactionCreate,
      walletUpdateBalanceDelta,
    } = makeDeps(
      wallet,
      makeExistingLoan({
        wallet_id: null,
        skip_transaction: true,
        linked_transaction_id: null,
        type: 'borrow',
      })
    );

    const loan = await updateLoan('loan-1', input({
      wallet_id: wallet.id,
      skip_transaction: false,
      type: 'borrow',
    }), deps);

    expect(transactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      id: 'tx-new',
      wallet_id: wallet.id,
      category_id: 'cat-vay-no',
      type: 'income',
      amount: 1_000_000,
    }));
    expect(walletUpdateBalanceDelta).toHaveBeenCalledWith(wallet.id, 1_000_000, 890);
    expect(loan).toEqual(expect.objectContaining({
      skip_transaction: false,
      linked_transaction_id: 'tx-new',
      type: 'borrow',
    }));
  });

  it.each([
    { type: 'lend' as const, transactionType: 'expense' as const, expectedBalance: -1_000_000 },
    { type: 'borrow' as const, transactionType: 'income' as const, expectedBalance: 1_000_000 },
  ])(
    'persists transaction history and wallet balance when enabling transactions for $type',
    async ({ type, transactionType, expectedBalance }) => {
      generateUUIDMock.mockReturnValueOnce('tx-stateful');
      const walletRepo = new InMemoryWalletRepository([{ ...wallet, balance: 0 }]);
      const transactionRepo = new InMemoryTransactionRepository();
      const existingLoan = makeExistingLoan({
        wallet_id: null,
        skip_transaction: true,
        linked_transaction_id: null,
        type,
      });
      const deps = makeDeps(wallet, existingLoan).deps;
      deps.walletRepo = walletRepo;
      deps.transactionRepo = transactionRepo;

      await updateLoan('loan-1', input({
        wallet_id: wallet.id,
        skip_transaction: false,
        type,
      }), deps);

      await expect(walletRepo.getById(wallet.id)).resolves.toMatchObject({
        balance: expectedBalance,
      });
      await expect(transactionRepo.list({ wallet_id: wallet.id })).resolves.toEqual([
        expect.objectContaining({
          id: 'tx-stateful',
          type: transactionType,
          amount: 1_000_000,
        }),
      ]);
    },
  );

  it('does not touch transactions when skip_transaction does not change', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(321);
    const { deps, loanUpdateLoan, transactionCreate, transactionSoftDelete } = makeDeps(
      wallet,
      makeExistingLoan({
        skip_transaction: false,
        linked_transaction_id: 'tx-existing',
      })
    );

    await updateLoan('loan-1', input({ contact_name: 'Tran Van B' }), deps);

    expect(transactionCreate).not.toHaveBeenCalled();
    expect(transactionSoftDelete).not.toHaveBeenCalled();
    expect(loanUpdateLoan).toHaveBeenCalledWith('loan-1', expect.objectContaining({
      contact_name: 'Tran Van B',
      skip_transaction: false,
      linked_transaction_id: 'tx-existing',
    }));
  });

  it('creates only one opening transaction for concurrent updates', async () => {
    generateUUIDMock
      .mockReturnValueOnce('tx-concurrent-1')
      .mockReturnValueOnce('tx-concurrent-2');
    let currentLoan = makeExistingLoan({
      wallet_id: null,
      skip_transaction: true,
      linked_transaction_id: null,
    });
    const walletRepo = new InMemoryWalletRepository([{ ...wallet, balance: 0 }]);
    const transactionRepo = new InMemoryTransactionRepository();
    const baseDeps = makeDeps(wallet, currentLoan).deps;
    baseDeps.walletRepo = walletRepo;
    baseDeps.transactionRepo = transactionRepo;
    baseDeps.loanRepo.getLoanById = vi.fn(async () => ({ ...currentLoan }));
    baseDeps.loanRepo.updateLoan = vi.fn(async (id, data) => {
      currentLoan = {
        ...currentLoan,
        ...data,
        id,
        contact_info: data.contact_info ?? null,
        due_date: data.due_date ?? null,
        note: data.note ?? null,
        deleted_at: null,
      };
      return { ...currentLoan };
    });

    const updateInput = input({
      wallet_id: wallet.id,
      skip_transaction: false,
      loan_date: '2026-07-01',
    });
    const [first, second] = await Promise.all([
      updateLoan('loan-1', updateInput, baseDeps),
      updateLoan('loan-1', updateInput, baseDeps),
    ]);

    const transactions = await transactionRepo.list({});
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      source_type: 'loan',
      source_id: 'loan-1',
      source_event: 'opening',
    });
    expect(first.linked_transaction_id).toBe(transactions[0].id);
    expect(second.linked_transaction_id).toBe(transactions[0].id);
    await expect(walletRepo.getById(wallet.id)).resolves.toMatchObject({ balance: -1_000_000 });
  });

  it.each(['settled', 'cancelled'] as const)(
    'does not create an opening transaction for a %s loan',
    async (status) => {
      const { deps, transactionCreate, walletUpdateBalanceDelta, loanUpdateLoan } = makeDeps(
        wallet,
        makeExistingLoan({
          wallet_id: null,
          skip_transaction: true,
          linked_transaction_id: null,
          status,
        })
      );

      await expect(updateLoan('loan-1', input({
        wallet_id: wallet.id,
        skip_transaction: false,
      }), deps)).rejects.toThrow();

      expect(transactionCreate).not.toHaveBeenCalled();
      expect(walletUpdateBalanceDelta).not.toHaveBeenCalled();
      expect(loanUpdateLoan).not.toHaveBeenCalled();
    }
  );

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
