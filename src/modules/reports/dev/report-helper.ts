import { SQLiteReportRepository } from '../repositories/sqlite-report.repository';
import { buildDateRange } from '../services/build-date-range';
import { GetCategorySummaryUseCase } from '../services/get-category-summary';
import { GetPeriodSummaryUseCase } from '../services/get-period-summary';
import { GetCashflowSummaryUseCase } from '../services/get-cashflow-summary';

export async function dumpReportData() {
  const repo = new SQLiteReportRepository();
  const getCategory = new GetCategorySummaryUseCase(repo);
  const getPeriod = new GetPeriodSummaryUseCase(repo);
  const getCashflow = new GetCashflowSummaryUseCase(repo);

  const range = buildDateRange('this_month');
  
  console.log('--- REPORT DATA DUMP (THIS MONTH) ---');
  console.log('Date Range:', new Date(range.startDate), 'to', new Date(range.endDate));
  
  const cashflow = await getCashflow.execute(range);
  console.log('Cashflow:', JSON.stringify(cashflow, null, 2));

  const expenses = await getCategory.execute(range, 'expense');
  console.log('Category Expenses:', JSON.stringify(expenses, null, 2));

  const periodDays = await getPeriod.execute(range, 'day');
  console.log('Period by Day:', JSON.stringify(periodDays, null, 2));
}
