import { beforeEach, describe, it, expect, vi } from 'vitest';
import { classifyBudgetStatus } from '../modules/budgets/services/classify-budget-status';
import { CalculateBudgetProgressUseCase } from '../modules/budgets/services/calculate-budget-progress';
import { UpsertCategoryBudgetUseCase } from '../modules/budgets/services/upsert-category-budget';
import { IBudgetRepository } from '../modules/budgets/repositories/budget.repository';
import { BudgetWithCategory } from '../modules/budgets/domain/budget.model';
import { SQLiteBudgetRepository } from '../modules/budgets/repositories/sqlite-budget.repository';
import { getDbConnection } from '@/core/db/sqlite/connection';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web' }
}));

// Mock pragmas
vi.mock('@/core/db/sqlite/pragmas', () => ({
  sqlite: { saveToStore: vi.fn() }
}));

// Mock DB_NAME
vi.mock('@/core/db/sqlite/connection', () => ({
  DB_NAME: 'test_db',
  getDbConnection: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Budget Threshold Classification', () => {
  it('should return safe for < 80%', () => {
    expect(classifyBudgetStatus(0.79)).toBe('safe');
    expect(classifyBudgetStatus(0)).toBe('safe');
  });

  it('should return warning for >= 80% and < 100%', () => {
    expect(classifyBudgetStatus(0.80)).toBe('warning');
    expect(classifyBudgetStatus(0.99)).toBe('warning');
  });

  it('should return exceeded for >= 100%', () => {
    expect(classifyBudgetStatus(1.0)).toBe('exceeded');
    expect(classifyBudgetStatus(1.5)).toBe('exceeded');
  });
});

describe('Budget Calculation Rules', () => {
  // IBudgetRepository đúng với interface hiện tại (không có getCategoryBudget)
  const mockRepo: IBudgetRepository = {
    getActiveBudgets: vi.fn(),
    getActiveBudgetsByAccountType: vi.fn(),
    getBudgetById: vi.fn(),
    upsertBudget: vi.fn(),
    deactivateBudget: vi.fn(),
    getSpentAmount: vi.fn(),
    getSpentAmountByAccountType: vi.fn(),
    getAllCategoryBudgets: vi.fn(),
    upsertCategoryBudget: vi.fn(),
    deleteCategoryBudget: vi.fn(),
  };

  const calculateProgress = new CalculateBudgetProgressUseCase(mockRepo);

  // Helper: tạo BudgetWithCategory fixture đầy đủ required fields
  const makeBudget = (overrides: Partial<BudgetWithCategory> = {}): BudgetWithCategory => ({
    id: 'budget-1',
    category_id: '1',
    wallet_id: null,
    account_type_scope: null,
    amount: 0,
    period: 'monthly',
    start_date: 0,
    end_date: null,
    is_active: true,
    created_at: 0,
    updated_at: 0,
    category_name: 'Food',
    category_type: 'expense',
    ...overrides,
  });

  it('should return null for category with no budget', async () => {
    const budget = makeBudget({ amount: 0 }); // amount = 0 → falsy → trả null
    const result = await calculateProgress.execute(budget, 1000, 2000);
    expect(result).toBeNull();
  });

  it('should handle zero spent correctly (no transactions in period)', async () => {
    vi.mocked(mockRepo.getSpentAmount).mockResolvedValueOnce(0);
    const budget = makeBudget({ amount: 100, period: 'weekly' });

    const result = await calculateProgress.execute(budget, 1000, 2000);

    expect(result).not.toBeNull();
    expect(result?.spent_amount).toBe(0);
    expect(result?.remaining_amount).toBe(100);
    expect(result?.percentage).toBe(0);
    expect(result?.status).toBe('safe');
  });

  it('should calculate warning status correctly', async () => {
    vi.mocked(mockRepo.getSpentAmount).mockResolvedValueOnce(85);
    const budget = makeBudget({ amount: 100, period: 'monthly' });

    const result = await calculateProgress.execute(budget, 1000, 2000);

    expect(result).not.toBeNull();
    expect(result?.spent_amount).toBe(85);
    expect(result?.remaining_amount).toBe(15);
    expect(result?.percentage).toBe(0.85);
    expect(result?.status).toBe('warning');
  });

  it('should calculate exceeded status correctly', async () => {
    vi.mocked(mockRepo.getSpentAmount).mockResolvedValueOnce(120);
    const budget = makeBudget({ amount: 100, period: 'weekly' });

    const result = await calculateProgress.execute(budget, 1000, 2000);

    expect(result).not.toBeNull();
    expect(result?.spent_amount).toBe(120);
    expect(result?.remaining_amount).toBe(-20); // 100 - 120 = -20 (không có Math.max ở service)
    expect(result?.percentage).toBe(1.2);
    expect(result?.status).toBe('exceeded');
  });
});

describe('Upsert Category Budget Validation', () => {
  const mockRepo: IBudgetRepository = {
    getActiveBudgets: vi.fn(),
    getActiveBudgetsByAccountType: vi.fn(),
    getBudgetById: vi.fn(),
    upsertBudget: vi.fn(),
    deactivateBudget: vi.fn(),
    getSpentAmount: vi.fn(),
    getSpentAmountByAccountType: vi.fn(),
    getAllCategoryBudgets: vi.fn(),
    upsertCategoryBudget: vi.fn(),
    deleteCategoryBudget: vi.fn(),
  };

  const upsertBudget = new UpsertCategoryBudgetUseCase(mockRepo);

  it('should throw if amount is negative or 0', async () => {
    await expect(upsertBudget.execute('1', 0, 'weekly')).rejects.toThrow('Budget amount must be greater than 0');
    await expect(upsertBudget.execute('1', -50, 'weekly')).rejects.toThrow('Budget amount must be greater than 0');
  });

  it('should throw if amount or period is partially null', async () => {
    await expect(upsertBudget.execute('1', 100, null)).rejects.toThrow('Both amount and period must be provided');
    await expect(upsertBudget.execute('1', null, 'weekly')).rejects.toThrow('Both amount and period must be provided');
  });

  it('should call repository if valid', async () => {
    await upsertBudget.execute('1', 100, 'weekly');
    expect(mockRepo.upsertBudget).toHaveBeenCalledWith(expect.objectContaining({
      category_id: '1',
      wallet_id: null,
      account_type_scope: null,
      amount: 100,
      period: 'weekly',
      start_date: expect.any(Number),
    }));
  });

  it('should call repository to clear if both are null', async () => {
    await upsertBudget.execute('1', null, null);
    expect(mockRepo.upsertCategoryBudget).toHaveBeenCalledWith('1', null, null);
  });
});

describe('SQLiteBudgetRepository upsert behavior', () => {
  it('deactivates the existing active budget for the same category even when period or scope changes', async () => {
    const mockDb = {
      run: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getDbConnection).mockResolvedValue(mockDb as any);

    await new SQLiteBudgetRepository().upsertBudget({
      category_id: 'cat-food',
      wallet_id: null,
      account_type_scope: 'credit_card',
      amount: 500000,
      period: 'weekly',
      start_date: 1000,
    });

    const [deactivateSql, deactivateParams] = mockDb.run.mock.calls[0];
    expect(deactivateSql).toContain('UPDATE budgets');
    expect(deactivateSql).not.toContain('AND period');
    expect(deactivateSql).toContain('wallet_id IS NULL');
    expect(deactivateSql).toContain('account_type_scope = ?');
    expect(deactivateParams).toEqual([
      expect.any(Number),
      'cat-food',
      'credit_card',
      'credit_card',
    ]);

    const [insertSql, insertParams] = mockDb.run.mock.calls[1];
    expect(insertSql).toContain('INSERT INTO budgets');
    expect(insertParams).toEqual([
      expect.any(String),
      'cat-food',
      null,
      'credit_card',
      500000,
      'weekly',
      1000,
      null,
      expect.any(Number),
      expect.any(Number),
    ]);
  });

  it('clears active global and account-type budgets for a category', async () => {
    const mockDb = {
      run: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getDbConnection).mockResolvedValue(mockDb as any);

    await new SQLiteBudgetRepository().upsertCategoryBudget('cat-bills', null, null);

    const [clearSql, clearParams] = mockDb.run.mock.calls[0];
    expect(clearSql).toContain('UPDATE budgets');
    expect(clearSql).toContain('wallet_id IS NULL');
    expect(clearSql).not.toContain('account_type_scope IS NULL');
    expect(clearParams).toEqual([expect.any(Number), 'cat-bills']);
  });
});
