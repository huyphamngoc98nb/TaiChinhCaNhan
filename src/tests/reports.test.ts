import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteReportRepository } from '../modules/reports/repositories/sqlite-report.repository';
import { buildDateRange } from '../modules/reports/services/build-date-range';
import { GetPeriodSummaryUseCase } from '../modules/reports/services/get-period-summary';
import { getDbConnection } from '@/core/db/sqlite/connection';
import { DEFAULT_DISPLAY_FORMAT_SETTINGS } from '@/modules/settings/services/display-format-settings.service';

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
      expect.stringContaining('net_by_category'),
      [range.startDate, range.endDate, range.startDate, range.endDate]
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

  it('getCategorySummary: excludes budget offset income from income donut charts', async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    await repo.getCategorySummary(range, 'income');

    const [sql] = mockDb.query.mock.calls[0];
    expect(sql).toContain('t.exclude_from_total = 0');
    expect(sql).toContain('t.is_budget_offset = 0');
    expect(sql).toContain("t.type = 'income'");
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.any(String),
      [range.startDate, range.endDate]
    );
  });

  it('getCategorySummary: subtracts budget offsets from expense donut categories', async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    await repo.getCategorySummary(range, 'expense');

    const [sql] = mockDb.query.mock.calls[0];
    expect(sql).toContain('WITH expense_by_category AS');
    expect(sql).toContain('offset_by_category AS');
    expect(sql).toContain('JOIN budgets b ON b.id = t.offset_budget_id');
    expect(sql).toContain('t.offset_budget_id IS NOT NULL');
    expect(sql).toContain('b.category_id');
    expect(sql).toContain('e.gross_amount - COALESCE(o.offset_amount, 0)');
    expect(sql).toContain('WHERE amount > 0');
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.any(String),
      [range.startDate, range.endDate, range.startDate, range.endDate]
    );
  });

  it('getCategorySummary: expense uses budget offsets even when offset transactions are excluded from totals', async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    await repo.getCategorySummary(range, 'expense');

    const [sql] = mockDb.query.mock.calls[0];
    const offsetSection = sql.split('offset_by_category AS')[1]?.split('net_by_category AS')[0] || '';
    expect(offsetSection).toContain('t.is_budget_offset = 1');
    expect(offsetSection).toContain('t.offset_budget_id IS NOT NULL');
    expect(offsetSection).not.toContain('t.exclude_from_total = 0');
  });

  it('getCategorySummary: maps net expense rows returned by SQLite', async () => {
    mockDb.query.mockResolvedValue({
      values: [
        { category_id: 'food', category_name: 'Food', amount: 700, type: 'expense' }
      ]
    });

    const result = await repo.getCategorySummary(range, 'expense');

    expect(result).toEqual([
      { category_id: 'food', category_name: 'Food', amount: 700, type: 'expense' }
    ]);
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

  it('getPeriodSummary: excludes budget offset income from cashflow periods', async () => {
    mockDb.query.mockResolvedValue({ values: [] });
    await repo.getPeriodSummary(range, 'day');

    const [sql] = mockDb.query.mock.calls[0];
    expect(sql).toContain('is_budget_offset = 0');
    expect(sql).toContain("(type <> 'income' OR is_budget_offset = 0)");
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

  it('getCashflowSummary excludes transfers such as credit card payments', async () => {
    mockDb.query.mockResolvedValue({ values: [{ totalIncome: 0, totalExpense: 0 }] });
    await repo.getCashflowSummary(range);

    const [sql] = mockDb.query.mock.calls[0];
    expect(sql).toContain("type IN ('income', 'expense')");
    expect(sql).not.toContain("'transfer'");
  });

  it('getCashflowSummary: excludes budget offset income from totals and net cashflow', async () => {
    mockDb.query.mockResolvedValue({ values: [{ totalIncome: 0, totalExpense: 0 }] });
    await repo.getCashflowSummary(range);

    const [sql] = mockDb.query.mock.calls[0];
    expect(sql).toContain('is_budget_offset = 0');
    expect(sql).toContain("(type <> 'income' OR is_budget_offset = 0)");
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

  it('builds this_week range starting on Sunday when configured', () => {
    const range = buildDateRange('this_week', undefined, {
      ...DEFAULT_DISPLAY_FORMAT_SETTINGS,
      weekStart: 'sunday',
    });
    const start = new Date(range.startDate);
    expect(start.getDay()).toBe(0);
    expect(start.getHours()).toBe(0);

    const end = new Date(range.endDate);
    expect(end.getDay()).toBe(6);
    expect(end.getHours()).toBe(23);
  });
});

describe('GetPeriodSummaryUseCase', () => {
  it('aggregates weekly cashflow using Monday as the default week start', async () => {
    const repo = {
      getPeriodSummary: vi.fn().mockResolvedValue([
        { period: '2026-06-20', income: 100, expense: 20 },
        { period: '2026-06-21', income: 200, expense: 30 },
      ]),
    } as any;
    const range = { startDate: 0, endDate: 1 };

    const result = await new GetPeriodSummaryUseCase(repo).execute(range, 'week');

    expect(repo.getPeriodSummary).toHaveBeenCalledWith(range, 'day');
    expect(result).toEqual([
      { period: '2026-06-15', income: 300, expense: 50 },
    ]);
  });

  it('aggregates weekly cashflow using Sunday when configured', async () => {
    const repo = {
      getPeriodSummary: vi.fn().mockResolvedValue([
        { period: '2026-06-20', income: 100, expense: 20 },
        { period: '2026-06-21', income: 200, expense: 30 },
      ]),
    } as any;
    const range = { startDate: 0, endDate: 1 };

    const result = await new GetPeriodSummaryUseCase(repo).execute(range, 'week', {
      ...DEFAULT_DISPLAY_FORMAT_SETTINGS,
      weekStart: 'sunday',
    });

    expect(repo.getPeriodSummary).toHaveBeenCalledWith(range, 'day');
    expect(result).toEqual([
      { period: '2026-06-14', income: 100, expense: 20 },
      { period: '2026-06-21', income: 200, expense: 30 },
    ]);
  });
});
