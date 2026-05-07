import { IReportRepository } from '../repositories/report.repository';
import { DateRange, ReportGranularity } from '../domain/report.model';

export class GetPeriodSummaryUseCase {
  constructor(private repository: IReportRepository) {}

  async execute(range: DateRange, granularity: ReportGranularity) {
    return this.repository.getPeriodSummary(range, granularity);
  }
}
