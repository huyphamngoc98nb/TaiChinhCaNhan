import type {
  BudgetReport,
  BudgetReportBudgetSource,
  BudgetReportCategory,
  BudgetReportFilters,
  BudgetReportSource,
  BudgetReportStatus,
  BudgetReportTrendPoint,
  DateRange,
  ReportGranularity,
} from '../domain/report.model';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function endOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - 1;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function parseDateKey(value: string): Date | null {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function classifyBudgetReportStatus(
  budgetAmount: number,
  actualSpending: number,
): BudgetReportStatus {
  if (budgetAmount <= 0) return 'NO_BUDGET';
  if (actualSpending >= budgetAmount) return 'OVER_BUDGET';
  if (actualSpending >= budgetAmount * 0.8) return 'NEAR_LIMIT';
  return 'IN_BUDGET';
}

export function calculateBudgetAmountForRange(
  budget: BudgetReportBudgetSource,
  range: DateRange,
): number {
  const firstDay = Math.max(startOfDay(range.startDate), startOfDay(budget.startDate));
  const lastDay = Math.min(
    endOfDay(range.endDate),
    budget.endDate == null ? endOfDay(range.endDate) : endOfDay(budget.endDate),
  );

  if (lastDay < firstDay || budget.amount <= 0) return 0;

  let allocated = 0;
  const cursor = new Date(firstDay);
  const finalDay = startOfDay(lastDay);

  while (cursor.getTime() <= finalDay) {
    const daysInPeriod = budget.period === 'weekly'
      ? 7
      : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    allocated += budget.amount / daysInPeriod;
    cursor.setDate(cursor.getDate() + 1);
  }

  return allocated;
}

function calculateAmounts(budgetAmount: number, actualSpending: number) {
  const safeBudget = Math.max(budgetAmount, 0);
  const safeSpending = Math.max(actualSpending, 0);
  return {
    remainingAmount: Math.max(safeBudget - safeSpending, 0),
    overspentAmount: Math.max(safeSpending - safeBudget, 0),
    usagePercentage: safeBudget > 0 ? (safeSpending / safeBudget) * 100 : 0,
    status: classifyBudgetReportStatus(safeBudget, safeSpending),
  };
}

function countRangeDays(range: DateRange): number {
  return Math.max(1, Math.ceil((endOfDay(range.endDate) - startOfDay(range.startDate) + 1) / MS_PER_DAY));
}

function chooseTrendGranularity(range: DateRange): ReportGranularity {
  const days = countRangeDays(range);
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

function trendKey(dateKey: string, granularity: ReportGranularity, weekStartsOn: 0 | 1): string {
  if (granularity === 'day') return dateKey;
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  if (granularity === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  const day = date.getDay();
  const offset = (day - weekStartsOn + 7) % 7;
  date.setDate(date.getDate() - offset);
  return toDateKey(date);
}

function buildTrend(
  source: BudgetReportSource,
  range: DateRange,
  includedCategoryIds: Set<string>,
  weekStartsOn: 0 | 1,
): { points: BudgetReportTrendPoint[]; granularity: ReportGranularity } {
  const granularity = chooseTrendGranularity(range);
  const grouped = new Map<string, number>();

  source.trend.forEach((item) => {
    if (!includedCategoryIds.has(item.categoryId)) return;
    const key = trendKey(item.date, granularity, weekStartsOn);
    grouped.set(key, (grouped.get(key) ?? 0) + Math.max(item.actualSpending, 0));
  });

  return {
    granularity,
    points: [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, actualSpending]) => ({ date, actualSpending })),
  };
}

export function calculateBudgetReport(
  source: BudgetReportSource,
  filters: BudgetReportFilters,
  options: { weekStartsOn?: 0 | 1 } = {},
): BudgetReport {
  if (filters.range.endDate < filters.range.startDate) {
    throw new Error('End date must be on or after start date.');
  }

  const categories = new Map<string, { categoryName: string; budgetAmount: number; actualSpending: number }>();

  source.budgets.forEach((budget) => {
    const current = categories.get(budget.categoryId) ?? {
      categoryName: budget.categoryName,
      budgetAmount: 0,
      actualSpending: 0,
    };
    current.budgetAmount += calculateBudgetAmountForRange(budget, filters.range);
    categories.set(budget.categoryId, current);
  });

  source.spending.forEach((spending) => {
    const current = categories.get(spending.categoryId) ?? {
      categoryName: spending.categoryName,
      budgetAmount: 0,
      actualSpending: 0,
    };
    current.actualSpending += Math.max(spending.actualSpending, 0);
    categories.set(spending.categoryId, current);
  });

  const categoryRows: BudgetReportCategory[] = [...categories.entries()]
    .map(([categoryId, item]) => ({
      categoryId,
      categoryName: item.categoryName,
      budgetAmount: item.budgetAmount,
      actualSpending: item.actualSpending,
      ...calculateAmounts(item.budgetAmount, item.actualSpending),
    }))
    .filter((item) => !filters.status || item.status === filters.status)
    .sort((left, right) => (
      right.actualSpending - left.actualSpending
      || right.budgetAmount - left.budgetAmount
      || left.categoryName.localeCompare(right.categoryName)
    ));

  const hasBudget = [...categories.values()].some((item) => item.budgetAmount > 0);
  const hasSpending = [...categories.values()].some((item) => item.actualSpending > 0);

  const totalBudget = categoryRows.reduce((sum, item) => sum + item.budgetAmount, 0);
  const totalActualSpending = categoryRows.reduce((sum, item) => sum + item.actualSpending, 0);
  const summaryAmounts = calculateAmounts(totalBudget, totalActualSpending);
  const includedCategoryIds = new Set(categoryRows.map((item) => item.categoryId));
  const trend = buildTrend(source, filters.range, includedCategoryIds, options.weekStartsOn ?? 1);

  return {
    period: filters.range,
    summary: {
      totalBudget,
      totalActualSpending,
      ...summaryAmounts,
    },
    categories: categoryRows,
    trend: trend.points,
    trendGranularity: trend.granularity,
    hasBudget,
    hasSpending,
  };
}
