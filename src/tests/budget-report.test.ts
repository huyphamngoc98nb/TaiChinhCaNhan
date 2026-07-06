import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDbConnection } from '@/core/db/sqlite/connection';
import { SQLiteReportRepository } from '@/modules/reports/repositories/sqlite-report.repository';
import {
  calculateBudgetAmountForRange,
  calculateBudgetReport,
  classifyBudgetReportStatus,
} from '@/modules/reports/services/calculate-budget-report';
import type {
  BudgetReportBudgetSource,
  BudgetReportSource,
  DateRange,
} from '@/modules/reports/domain/report.model';

vi.mock('@/core/db/sqlite/connection', () => ({
  getDbConnection: vi.fn(),
}));

const january: DateRange = {
  startDate: new Date(2026, 0, 1).getTime(),
  endDate: new Date(2026, 0, 31, 23, 59, 59, 999).getTime(),
};

function budget(overrides: Partial<BudgetReportBudgetSource> = {}): BudgetReportBudgetSource {
  return {
    id: 'budget-food',
    categoryId: 'food',
    categoryName: 'Food',
    amount: 3_100,
    period: 'monthly',
    startDate: january.startDate,
    endDate: null,
    ...overrides,
  };
}

function source(overrides: Partial<BudgetReportSource> = {}): BudgetReportSource {
  return {
    budgets: [budget()],
    spending: [{ categoryId: 'food', categoryName: 'Food', actualSpending: 2_000 }],
    trend: [{ date: '2026-01-10', categoryId: 'food', actualSpending: 2_000 }],
    ...overrides,
  };
}

describe('Budget Report calculations', () => {
  it('prorates a recurring monthly budget across the selected date range', () => {
    const firstTenDays = {
      startDate: january.startDate,
      endDate: new Date(2026, 0, 10, 23, 59, 59, 999).getTime(),
    };

    expect(calculateBudgetAmountForRange(budget(), firstTenDays)).toBeCloseTo(1_000);
  });

  it('calculates total budget, spending, remaining, overspent, and usage', () => {
    const report = calculateBudgetReport(source(), { range: january });

    expect(report.summary.totalBudget).toBeCloseTo(3_100);
    expect(report.summary.totalActualSpending).toBe(2_000);
    expect(report.summary.remainingAmount).toBeCloseTo(1_100);
    expect(report.summary.overspentAmount).toBe(0);
    expect(report.summary.usagePercentage).toBeCloseTo((2_000 / 3_100) * 100);
    expect(report.summary.status).toBe('IN_BUDGET');
  });

  it.each([
    [0, 100, 'NO_BUDGET'],
    [100, 79.99, 'IN_BUDGET'],
    [100, 80, 'NEAR_LIMIT'],
    [100, 99.99, 'NEAR_LIMIT'],
    [100, 100, 'OVER_BUDGET'],
  ] as const)('classifies budget %s with spending %s as %s', (limit, spending, expected) => {
    expect(classifyBudgetReportStatus(limit, spending)).toBe(expected);
  });

  it('uses inclusive 80-percent and 100-percent status thresholds', () => {
    expect(classifyBudgetReportStatus(100, 80)).toBe('NEAR_LIMIT');
    expect(classifyBudgetReportStatus(100, 100)).toBe('OVER_BUDGET');
  });

  it('reports no budget safely without dividing by zero', () => {
    const report = calculateBudgetReport(source({ budgets: [] }), { range: january });

    expect(report.summary.totalBudget).toBe(0);
    expect(report.summary.totalActualSpending).toBe(0);
    expect(report.summary.status).toBe('NO_BUDGET');
    expect(report.summary.usagePercentage).toBe(0);
    expect(report.summary.remainingAmount).toBe(0);
    expect(report.summary.overspentAmount).toBe(0);
    expect(report.categories).toEqual([]);
    expect(report.trend).toEqual([]);
    expect(report.hasBudget).toBe(false);
    expect(report.hasSpending).toBe(false);
  });

  it('reports a configured budget safely when there is no spending', () => {
    const report = calculateBudgetReport(source({ spending: [], trend: [] }), { range: january });

    expect(report.summary.totalActualSpending).toBe(0);
    expect(report.summary.remainingAmount).toBeCloseTo(3_100);
    expect(report.summary.usagePercentage).toBe(0);
    expect(report.summary.status).toBe('IN_BUDGET');
    expect(report.hasSpending).toBe(false);
  });

  it('excludes spending from categories without a budget', () => {
    const report = calculateBudgetReport(source({
      spending: [{ categoryId: 'travel', categoryName: 'Travel', actualSpending: 500 }],
      trend: [{ date: '2026-01-10', categoryId: 'travel', actualSpending: 500 }],
    }), { range: january });

    expect(report.categories.map((item) => item.categoryId)).toEqual(['food']);
    expect(report.summary.totalActualSpending).toBe(0);
    expect(report.summary.remainingAmount).toBeCloseTo(3_100);
    expect(report.summary.overspentAmount).toBe(0);
    expect(report.summary.usagePercentage).toBe(0);
    expect(report.trend).toEqual([]);
  });

  it('calculates totals from budgeted categories only', () => {
    const report = calculateBudgetReport(source({
      budgets: [
        budget({ amount: 3_000 }),
        budget({ id: 'budget-travel', categoryId: 'travel', categoryName: 'Travel', amount: 1_500 }),
      ],
      spending: [
        { categoryId: 'food', categoryName: 'Food', actualSpending: 2_700 },
        { categoryId: 'travel', categoryName: 'Travel', actualSpending: 800 },
        { categoryId: 'shopping', categoryName: 'Shopping', actualSpending: 2_000 },
        { categoryId: 'entertainment', categoryName: 'Entertainment', actualSpending: 500 },
      ],
      trend: [
        { date: '2026-01-10', categoryId: 'food', actualSpending: 2_700 },
        { date: '2026-01-11', categoryId: 'travel', actualSpending: 800 },
        { date: '2026-01-12', categoryId: 'shopping', actualSpending: 2_000 },
        { date: '2026-01-13', categoryId: 'entertainment', actualSpending: 500 },
      ],
    }), { range: january });

    expect(report.categories.map((item) => item.categoryId).sort()).toEqual(['food', 'travel']);
    expect(report.summary.totalBudget).toBeCloseTo(4_500);
    expect(report.summary.totalActualSpending).toBe(3_500);
    expect(report.summary.remainingAmount).toBeCloseTo(1_000);
    expect(report.summary.overspentAmount).toBe(0);
    expect(report.summary.usagePercentage).toBeCloseTo((3_500 / 4_500) * 100);
    expect(report.trend.reduce((sum, item) => sum + item.actualSpending, 0)).toBe(3_500);
  });

  it('ignores zero-value budgets and remains division-by-zero safe', () => {
    const report = calculateBudgetReport(source({
      budgets: [budget({ amount: 0 })],
    }), { range: january });

    expect(report.summary.totalBudget).toBe(0);
    expect(report.summary.totalActualSpending).toBe(0);
    expect(report.summary.usagePercentage).toBe(0);
    expect(report.categories).toEqual([]);
  });

  it('aggregates category budgets and sorts categories by actual spending descending', () => {
    const report = calculateBudgetReport(source({
      budgets: [
        budget(),
        budget({ id: 'budget-food-weekly', amount: 700, period: 'weekly' }),
        budget({ id: 'budget-rent', categoryId: 'rent', categoryName: 'Rent', amount: 1_550 }),
      ],
      spending: [
        { categoryId: 'food', categoryName: 'Food', actualSpending: 900 },
        { categoryId: 'rent', categoryName: 'Rent', actualSpending: 1_200 },
        { categoryId: 'food', categoryName: 'Food', actualSpending: 100 },
      ],
      trend: [],
    }), { range: january });

    expect(report.categories.map((item) => item.categoryId)).toEqual(['rent', 'food']);
    expect(report.categories.find((item) => item.categoryId === 'food')?.actualSpending).toBe(1_000);
    expect(report.categories.find((item) => item.categoryId === 'food')?.budgetAmount).toBeCloseTo(6_200);
  });

  it('applies the category status filter after aggregation', () => {
    const report = calculateBudgetReport(source({
      spending: [{ categoryId: 'food', categoryName: 'Food', actualSpending: 4_000 }],
    }), { range: january, status: 'OVER_BUDGET' });

    expect(report.categories).toHaveLength(1);
    expect(report.categories[0].status).toBe('OVER_BUDGET');
  });
});

describe('SQLite budget report source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes deleted, excluded, income, and transfer transactions from actual spending', async () => {
    const query = vi.fn().mockResolvedValue({ values: [] });
    vi.mocked(getDbConnection).mockResolvedValue({ query } as never);

    await new SQLiteReportRepository().getBudgetReportSource({ range: january });

    const spendingSql = String(query.mock.calls[1][0]);
    expect(spendingSql).toContain("t.type = 'expense'");
    expect(spendingSql).toContain('t.deleted_at IS NULL');
    expect(spendingSql).toContain('t.exclude_from_total = 0');
    expect(spendingSql).not.toContain("t.type = 'transfer'");
    expect(spendingSql).toContain("t.type = 'income'");
    expect(spendingSql).toContain('t.is_budget_offset = 1');
    expect(spendingSql).toContain('-t.amount AS signed_amount');
  });

  it('scopes budget and spending queries to selected category and wallet', async () => {
    const query = vi.fn().mockResolvedValue({ values: [] });
    vi.mocked(getDbConnection).mockResolvedValue({ query } as never);

    await new SQLiteReportRepository().getBudgetReportSource({
      range: january,
      categoryId: 'food',
      walletId: 'cash',
    });

    const budgetSql = String(query.mock.calls[0][0]);
    const spendingSql = String(query.mock.calls[1][0]);
    expect(budgetSql).toContain('b.category_id = ?');
    expect(budgetSql).toContain('b.wallet_id = ?');
    expect(spendingSql).toContain('t.category_id = ?');
    expect(spendingSql).toContain('t.wallet_id = ?');
  });
});
