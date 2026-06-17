import { sqliteTransactionRunner as runInTransaction } from '@/core/db/transaction-runner';
import { generateUUID } from '@/shared/utils/generate-uuid';
import type { Category, CategoryType } from '@/modules/categories/domain/category.model';
import type { ITransactionRepository } from '@/modules/transactions/repositories/transaction.repository';
import { getSourceDelta } from '@/modules/transactions/services/transaction-wallet-rules';
import type { IWalletRepository } from '@/modules/wallets/repositories/wallet.repository';
import type { CreateLoanInput, Loan, LoanType } from '../domain/loan.model';
import { validateCreateLoan } from '../domain/loan.schema';
import type { ILoanRepository } from '../repositories/loan.repository';
import { translations, type TranslationPath } from '@/shared/constants/translations';

function defaultText(path: TranslationPath): string {
  const keys = path.split('.');
  let current: unknown = translations.en;
  for (const key of keys) {
    if (!current || typeof current !== 'object' || !(key in current)) return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

export interface LoanCategoryRepository {
  list(type?: CategoryType): Promise<Category[]>;
  findBySlug?(slug: string): Promise<Category | null | undefined>;
  getBySlug?(slug: string): Promise<Category | null | undefined>;
}

export interface CreateLoanDeps {
  loanRepo: ILoanRepository;
  transactionRepo: ITransactionRepository;
  walletRepo: IWalletRepository;
  categoryRepo: LoanCategoryRepository;
}

export type LoanCategorySlug = 'cho_vay' | 'vay_no' | 'thu_no' | 'tra_no';

export const LOAN_CREATE_CATEGORY: Record<LoanType, { slug: LoanCategorySlug; type: CategoryType }> = {
  lend: { slug: 'cho_vay', type: 'expense' },
  borrow: { slug: 'vay_no', type: 'income' },
};

function normalizeCategoryKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function categoryKeySet(category: Category): Set<string> {
  const slug = (category as Category & { slug?: string }).slug;
  return new Set(
    [category.id, category.name, slug]
      .filter((value): value is string => Boolean(value))
      .map(normalizeCategoryKey)
  );
}

async function lookupBySlug(
  categoryRepo: LoanCategoryRepository,
  slug: string,
  type: CategoryType
): Promise<Category | null> {
  const lookup = categoryRepo.getBySlug ?? categoryRepo.findBySlug;
  if (!lookup) return null;

  const category = await lookup.call(categoryRepo, slug);
  return category?.type === type ? category : null;
}

export async function resolveLoanCategoryId(
  categoryRepo: LoanCategoryRepository,
  slug: LoanCategorySlug,
  type: CategoryType
): Promise<string> {
  const directMatch = await lookupBySlug(categoryRepo, slug, type);
  if (directMatch) return directMatch.id;

  const categories = await categoryRepo.list(type);
  const normalizedSlug = normalizeCategoryKey(slug);
  const categoryMatch = categories.find((category) => categoryKeySet(category).has(normalizedSlug));
  if (categoryMatch) return categoryMatch.id;

  const fallbackMatch = categories.find((category) => {
    const keys = categoryKeySet(category);
    return keys.has('other') || keys.has('khac');
  });
  if (fallbackMatch) return fallbackMatch.id;

  if (categories[0]) return categories[0].id;

  throw new Error('Loan category fallback not found');
}

export function dateToMs(date: string): number {
  const timestamp = new Date(`${date}T00:00:00`).getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error(defaultText('loans.errors.invalidDate'));
  }
  return timestamp;
}

export function msToLocalDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function createLoan(input: CreateLoanInput, deps: CreateLoanDeps): Promise<Loan> {
  validateCreateLoan(input);
  const skipTransaction = input.skip_transaction ?? false;

  let categoryId: string | null = null;
  const walletId: string | null = input.wallet_id ?? null;

  if (!skipTransaction) {
    if (!walletId) throw new Error('wallet_id is required');

    const wallet = await deps.walletRepo.getById(walletId);
    if (!wallet) throw new Error(defaultText('loans.errors.walletNotFound'));
    if (wallet.is_active !== 1) throw new Error(defaultText('loans.errors.walletInactive'));

    const categoryConfig = LOAN_CREATE_CATEGORY[input.type];
    categoryId = await resolveLoanCategoryId(
      deps.categoryRepo,
      categoryConfig.slug,
      categoryConfig.type
    );
  }

  const now = Date.now();
  const loanDate = input.loan_date ?? msToLocalDate(now);
  const loanId = generateUUID();
  const transactionId = skipTransaction ? null : generateUUID();
  const transactionType = input.type === 'lend' ? 'expense' : 'income';
  const transactionNote = input.type === 'lend'
    ? defaultText('loans.errors.lendNote').replace('{name}', input.contact_name)
    : defaultText('loans.errors.borrowNote').replace('{name}', input.contact_name);
  const transactionDate = dateToMs(loanDate);

  return runInTransaction(async () => {
    const loan = await deps.loanRepo.createLoan({
      ...input,
      loan_date: loanDate,
      wallet_id: walletId,
      skip_transaction: skipTransaction,
      linked_transaction_id: null,
      id: loanId,
      created_at: now,
      updated_at: now,
    });

    if (!skipTransaction) {
      await deps.transactionRepo.create({
        id: transactionId as string,
        wallet_id: walletId as string,
        category_id: categoryId as string,
        type: transactionType,
        amount: input.principal,
        note: transactionNote,
        transaction_date: transactionDate,
        created_at: now,
        updated_at: now,
      });

      // Loan services write directly to the repository, bypassing
      // CreateTransactionUseCase, so update the cached wallet balance here.
      await deps.walletRepo.updateBalanceDelta(
        walletId as string,
        getSourceDelta(transactionType, input.principal),
        now
      );

      const updatedLoan = await deps.loanRepo.updateLoan(loanId, {
        wallet_id: walletId,
        skip_transaction: skipTransaction,
        linked_transaction_id: transactionId,
        type: input.type,
        contact_name: input.contact_name,
        contact_info: input.contact_info,
        principal: input.principal,
        loan_date: loanDate,
        due_date: input.due_date,
        note: input.note,
        updated_at: now,
      });

      return updatedLoan ?? loan;
    }

    return loan;
  });
}
