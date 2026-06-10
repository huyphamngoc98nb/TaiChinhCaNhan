import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category } from '@/modules/categories/domain/category.model';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { InMemoryWalletRepository } from '@/tests/fakes/in-memory-wallet.repository';
import type { Loan, LoanPayment, LoanType } from '../domain/loan.model';
import type { ILoanRepository } from '../repositories/loan.repository';
import {
  addLoanPayment,
  LoanPaymentExceedError,
  type AddLoanPaymentDeps,
} from './add-loan-payment';

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
  balance: 0,
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

const settlementWallet: Wallet = {
  ...wallet,
  id: 'wallet-2',
  name: 'Bank',
};

function makeLoan(type: LoanType, principal = 1_000_000): Loan {
  return {
    id: 'loan-1',
    wallet_id: wallet.id,
    skip_transaction: false,
    linked_transaction_id: 'loan-transaction',
    type,
    contact_name: 'Nguyen Van A',
    contact_info: null,
    principal,
    due_date: null,
    note: null,
    status: 'active',
    created_at: 0,
    updated_at: 0,
    deleted_at: null,
  };
}

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

function makeDeps(type: LoanType, currentPaid = 0, principal = 1_000_000) {
  const loan = makeLoan(type, principal);
  const walletRepo = new InMemoryWalletRepository([wallet]);
  const categories: Record<string, Category> = {
    thu_no: category('cat-thu-no', 'thu_no', 'income'),
    tra_no: category('cat-tra-no', 'tra_no', 'expense'),
  };
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
  const createPayment = vi.fn(
    async (data: Parameters<ILoanRepository['createPayment']>[0]): Promise<LoanPayment> => ({
      id: data.id,
      loan_id: data.loan_id,
      wallet_id: data.wallet_id,
      amount: data.amount,
      payment_date: data.payment_date,
      note: data.note ?? null,
      created_at: data.created_at,
    }),
  );
  const getTotalPaid = vi.fn(async () => currentPaid);
  const updateLoanStatus = vi.fn();
  const updateBalanceDelta = vi.spyOn(walletRepo, 'updateBalanceDelta');

  const deps: AddLoanPaymentDeps = {
    loanRepo: {
      createLoan: vi.fn(),
      updateLoan: vi.fn(),
      getLoanById: vi.fn(async () => loan),
      listLoans: vi.fn(),
      updateLoanStatus,
      softDeleteLoan: vi.fn(),
      hardDeleteLoan: vi.fn(),
      createPayment,
      listPayments: vi.fn(),
      getTotalPaid,
    },
    transactionRepo: {
      create: transactionCreate,
      update: vi.fn(),
      softDelete: vi.fn(),
      getById: vi.fn(),
      getByIdIncludeDeleted: vi.fn(),
      list: vi.fn(),
    },
    walletRepo,
    categoryRepo: {
      findBySlug: vi.fn(async (slug: string) => categories[slug] ?? null),
      list: vi.fn(async (categoryType) =>
        Object.values(categories).filter((item) => item.type === categoryType)
      ),
    },
  };

  return { deps, transactionCreate, walletRepo, updateBalanceDelta, updateLoanStatus };
}

describe('addLoanPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateUUIDMock.mockReset();
    generateUUIDMock
      .mockReturnValueOnce('payment-id')
      .mockReturnValueOnce('transaction-id');
  });

  it("increases the wallet balance when collecting payment for a 'lend' loan", async () => {
    const { deps, transactionCreate, walletRepo } = makeDeps('lend');

    await addLoanPayment({
      loan_id: 'loan-1',
      wallet_id: wallet.id,
      amount: 250_000,
      payment_date: 1_000,
    }, deps);

    expect(transactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'income',
      amount: 250_000,
    }));
    await expect(walletRepo.getById(wallet.id)).resolves.toMatchObject({
      balance: 250_000,
    });
  });

  it('should credit wallet when collecting debt (lend loan payment)', async () => {
    const { deps, updateBalanceDelta } = makeDeps('lend');

    await addLoanPayment({
      loan_id: 'loan-1',
      wallet_id: wallet.id,
      amount: 100_000,
      payment_date: Date.now(),
    }, deps);

    expect(updateBalanceDelta).toHaveBeenCalledWith(
      wallet.id,
      100_000,
      expect.any(Number),
    );
  });

  it("reduces the wallet balance when repaying a 'borrow' loan", async () => {
    const { deps, transactionCreate, walletRepo } = makeDeps('borrow');

    await addLoanPayment({
      loan_id: 'loan-1',
      wallet_id: wallet.id,
      amount: 250_000,
      payment_date: 1_000,
    }, deps);

    expect(transactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      amount: 250_000,
    }));
    await expect(walletRepo.getById(wallet.id)).resolves.toMatchObject({
      balance: -250_000,
    });
  });

  it('should debit wallet when repaying debt (borrow loan payment)', async () => {
    const { deps, updateBalanceDelta } = makeDeps('borrow');

    await addLoanPayment({
      loan_id: 'loan-1',
      wallet_id: wallet.id,
      amount: 80_000,
      payment_date: Date.now(),
    }, deps);

    expect(updateBalanceDelta).toHaveBeenCalledWith(
      wallet.id,
      -80_000,
      expect.any(Number),
    );
  });

  it('should settle loan when total paid reaches principal', async () => {
    const { deps, updateBalanceDelta, updateLoanStatus } = makeDeps('lend', 400_000, 500_000);

    await addLoanPayment({
      loan_id: 'loan-1',
      wallet_id: wallet.id,
      amount: 100_000,
      payment_date: Date.now(),
    }, deps);

    expect(updateLoanStatus).toHaveBeenCalledWith('loan-1', 'settled', expect.any(Number));
    expect(updateBalanceDelta).toHaveBeenCalledWith(
      wallet.id,
      100_000,
      expect.any(Number),
    );
  });

  it('settles into the selected wallet even when it differs from the original loan wallet', async () => {
    const { deps, transactionCreate, updateLoanStatus } = makeDeps('lend', 400_000, 500_000);
    const walletRepo = new InMemoryWalletRepository([wallet, settlementWallet]);
    const updateBalanceDelta = vi.spyOn(walletRepo, 'updateBalanceDelta');
    deps.walletRepo = walletRepo;

    await addLoanPayment({
      loan_id: 'loan-1',
      wallet_id: settlementWallet.id,
      amount: 100_000,
      payment_date: Date.now(),
    }, deps);

    expect(transactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      wallet_id: settlementWallet.id,
      amount: 100_000,
    }));
    expect(updateBalanceDelta).toHaveBeenCalledWith(
      settlementWallet.id,
      100_000,
      expect.any(Number),
    );
    await expect(walletRepo.getById(wallet.id)).resolves.toMatchObject({ balance: 0 });
    await expect(walletRepo.getById(settlementWallet.id)).resolves.toMatchObject({ balance: 100_000 });
    expect(updateLoanStatus).toHaveBeenCalledWith('loan-1', 'settled', expect.any(Number));
  });

  it('should throw LoanPaymentExceedError when amount exceeds remaining', async () => {
    const { deps, updateBalanceDelta } = makeDeps('lend', 450_000, 500_000);

    await expect(addLoanPayment({
      loan_id: 'loan-1',
      wallet_id: wallet.id,
      amount: 100_000,
      payment_date: Date.now(),
    }, deps)).rejects.toBeInstanceOf(LoanPaymentExceedError);

    expect(updateBalanceDelta).not.toHaveBeenCalled();
  });

  it('should reject second concurrent payment when remaining is insufficient after first payment', async () => {
    const { deps, updateBalanceDelta } = makeDeps('lend');
    vi.mocked(deps.loanRepo.getTotalPaid)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(950_000);

    const firstPayment = addLoanPayment({
      loan_id: 'loan-1',
      wallet_id: wallet.id,
      amount: 950_000,
      payment_date: Date.now(),
    }, deps);
    const secondPayment = addLoanPayment({
      loan_id: 'loan-1',
      wallet_id: wallet.id,
      amount: 100_000,
      payment_date: Date.now(),
    }, deps);

    await expect(firstPayment).resolves.toMatchObject({ amount: 950_000 });
    await expect(secondPayment).rejects.toBeInstanceOf(LoanPaymentExceedError);
    expect(updateBalanceDelta).toHaveBeenCalledTimes(1);
  });
});
