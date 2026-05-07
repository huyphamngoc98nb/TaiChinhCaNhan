import { DateRange, ReportGranularity, CategorySummary, PeriodSummary, CashflowSummary } from '../domain/report.model';

export interface IReportRepository {
  getCategorySummary(range: DateRange, type: 'income' | 'expense'): Promise<CategorySummary[]>;
  getPeriodSummary(range: DateRange, granularity: ReportGranularity): Promise<PeriodSummary[]>;
  getCashflowSummary(range: DateRange): Promise<CashflowSummary>;
}
