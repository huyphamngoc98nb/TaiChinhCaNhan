import { IReportRepository } from '../repositories/report.repository';
import { DateRange } from '../domain/report.model';

export class GetCashflowSummaryUseCase {
  constructor(private repository: IReportRepository) {}

  async execute(range: DateRange) {
    return this.repository.getCashflowSummary(range);
  }
}
