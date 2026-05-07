import { IReportRepository } from '../repositories/report.repository';
import { DateRange } from '../domain/report.model';

export class GetCategorySummaryUseCase {
  constructor(private repository: IReportRepository) {}

  async execute(range: DateRange, type: 'income' | 'expense') {
    return this.repository.getCategorySummary(range, type);
  }
}
