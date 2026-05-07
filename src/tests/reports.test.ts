import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteReportRepository } from '../modules/reports/repositories/sqlite-report.repository';
import { buildDateRange } from '../modules/reports/services/build-date-range';
import { getDbConnection } from '@/core/db/sqlite/connection';

// Mock DB connection
vi.mock('@/core/db/sqlite/connection', () => ({
  getDbConnection: vi.fn(),
}));

describe('SQLiteReportRepository', () => {
  let mockDb: any;
  let repo: SQLiteReportRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      query: vi.fn(),
    };
    vi.mocked(getDbConnection).mockResolvedValue(mockDb);
    repo = new SQLiteReportRepository();
  });

  const range = { startDate: 1000000, endDate: 2000000 };

  it('getCategorySummary: handles empty dataset', async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    const result = await repo.getCategorySummary(range, 'expense');
    expect(result).toEqual([]);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('GROUP BY category_id'),
      ['expense', range.startDate, range.endDate]
    );
  });

  it('getCategorySummary: excludes soft-deleted records', async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    await repo.getCategorySummary(range, 'expense');
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('deleted_at IS NULL'),
      expect.any(Array)
    );
  });

  it('getCategorySummary: aggregates correctly', async () => {
    mockDb.query.mockResolvedValue({
      values: [
        { category_id: 'c1', amount: 150, type: 'expense' },
        { category_id: 'c2', amount: 50, type: 'expense' }
      ]
    });
    const result = await repo.getCategorySummary(range, 'expense');
    expect(result).toHaveLength(2);
    expect(result[0].amount).toBe(150);
  });

  it('getPeriodSummary: groups by day format', async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    await repo.getPeriodSummary(range, 'day');
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('strftime(?, transaction_date / 1000, \'unixepoch\')'),
      ['%Y-%m-%d', range.startDate, range.endDate]
    );
  });

  it('getPeriodSummary: groups by week format', async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    await repo.getPeriodSummary(range, 'week');
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('strftime(?, transaction_date / 1000, \'unixepoch\')'),
      ['%Y-%W', range.startDate, range.endDate]
    );
  });

  it('getPeriodSummary: handles single-day and multi-month formats properly', async () => {
    mockDb.query.mockResolvedValue({
      values: [
        { period: '2023-05', income: 1000, expense: 500 },
        { period: '2023-06', income: 1200, expense: 600 }
      ]
    });
    const result = await repo.getPeriodSummary(range, 'month');
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('strftime(?, transaction_date / 1000, \'unixepoch\')'),
      ['%Y-%m', range.startDate, range.endDate]
    );
    expect(result).toHaveLength(2);
    expect(result[0].period).toBe('2023-05');
  });

  it('getCashflowSummary: returns zero totals on empty dataset', async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    const result = await repo.getCashflowSummary(range);
    expect(result).toEqual({ totalIncome: 0, totalExpense: 0, netAmount: 0 });
  });

  it('getCashflowSummary: computes net amount correctly', async () => {
    mockDb.query.mockResolvedValue({
      values: [{ totalIncome: 5000, totalExpense: 2000 }]
    });
    const result = await repo.getCashflowSummary(range);
    expect(result).toEqual({ totalIncome: 5000, totalExpense: 2000, netAmount: 3000 });
  });

  it('getCashflowSummary: handles date range boundaries', async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    await repo.getCashflowSummary(range);
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('transaction_date >= ?'),
      expect.arrayContaining([range.startDate, range.endDate])
    );
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('transaction_date <= ?'),
      expect.arrayContaining([range.startDate, range.endDate])
    );
  });
});

describe('buildDateRange', () => {
  it('builds this_month range correctly', () => {
    const range = buildDateRange('this_month');
    expect(range.startDate).toBeLessThan(range.endDate);
    const start = new Date(range.startDate);
    expect(start.getDate()).toBe(1);
  });
  
  it('builds this_week range starting on Monday', () => {
    const range = buildDateRange('this_week');
    const start = new Date(range.startDate);
    // 1 in JS getDay() is Monday
    expect(start.getDay()).toBe(1);
    expect(start.getHours()).toBe(0);
    
    const end = new Date(range.endDate);
    // 0 in JS getDay() is Sunday
    expect(end.getDay()).toBe(0);
    expect(end.getHours()).toBe(23);
  });
});
