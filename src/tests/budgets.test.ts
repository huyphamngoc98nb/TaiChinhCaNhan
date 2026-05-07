import { describe, it, expect, vi } from 'vitest';
import { classifyBudgetStatus } from '../modules/budgets/services/classify-budget-status';
import { CalculateBudgetProgressUseCase } from '../modules/budgets/services/calculate-budget-progress';
import { UpsertCategoryBudgetUseCase } from '../modules/budgets/services/upsert-category-budget';
import { IBudgetRepository } from '../modules/budgets/repositories/budget.repository';
import { CategoryBudget } from '../modules/budgets/domain/budget.model';

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
  DB_NAME: 'test_db'
}));

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
  const mockRepo: IBudgetRepository = {
    getAllCategoryBudgets: vi.fn(),
    getCategoryBudget: vi.fn(),
    upsertCategoryBudget: vi.fn(),
    getSpentAmount: vi.fn(),
  };

  const calculateProgress = new CalculateBudgetProgressUseCase(mockRepo);

  it('should return null for category with no budget', async () => {
    const budget: CategoryBudget = {
      category_id: '1', category_name: 'Food', type: 'expense',
      budget_amount: null, budget_period: null
    };
    const result = await calculateProgress.execute(budget, 1000, 2000);
    expect(result).toBeNull();
  });

  it('should handle zero spent correctly (no transactions in period)', async () => {
    vi.mocked(mockRepo.getSpentAmount).mockResolvedValueOnce(0);
    const budget: CategoryBudget = {
      category_id: '1', category_name: 'Food', type: 'expense',
      budget_amount: 100, budget_period: 'weekly'
    };
    
    const result = await calculateProgress.execute(budget, 1000, 2000);
    
    expect(result).not.toBeNull();
    expect(result?.spent_amount).toBe(0);
    expect(result?.remaining_amount).toBe(100);
    expect(result?.percentage).toBe(0);
    expect(result?.status).toBe('safe');
  });

  it('should calculate warning status correctly', async () => {
    vi.mocked(mockRepo.getSpentAmount).mockResolvedValueOnce(85);
    const budget: CategoryBudget = {
      category_id: '1', category_name: 'Food', type: 'expense',
      budget_amount: 100, budget_period: 'monthly'
    };
    
    const result = await calculateProgress.execute(budget, 1000, 2000);
    
    expect(result).not.toBeNull();
    expect(result?.spent_amount).toBe(85);
    expect(result?.remaining_amount).toBe(15);
    expect(result?.percentage).toBe(0.85);
    expect(result?.status).toBe('warning');
  });

  it('should calculate exceeded status correctly', async () => {
    vi.mocked(mockRepo.getSpentAmount).mockResolvedValueOnce(120);
    const budget: CategoryBudget = {
      category_id: '1', category_name: 'Food', type: 'expense',
      budget_amount: 100, budget_period: 'weekly'
    };
    
    const result = await calculateProgress.execute(budget, 1000, 2000);
    
    expect(result).not.toBeNull();
    expect(result?.spent_amount).toBe(120);
    expect(result?.remaining_amount).toBe(0); // Math.max(0, ...)
    expect(result?.percentage).toBe(1.2);
    expect(result?.status).toBe('exceeded');
  });
});

describe('Upsert Category Budget Validation', () => {
  const mockRepo: IBudgetRepository = {
    getAllCategoryBudgets: vi.fn(),
    getCategoryBudget: vi.fn(),
    upsertCategoryBudget: vi.fn(),
    getSpentAmount: vi.fn(),
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
    expect(mockRepo.upsertCategoryBudget).toHaveBeenCalledWith('1', 100, 'weekly');
  });

  it('should call repository to clear if both are null', async () => {
    await upsertBudget.execute('1', null, null);
    expect(mockRepo.upsertCategoryBudget).toHaveBeenCalledWith('1', null, null);
  });
});
