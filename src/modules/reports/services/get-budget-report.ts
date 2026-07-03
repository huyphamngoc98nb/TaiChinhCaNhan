import type {
  BudgetReport,
  BudgetReportFilters,
} from '../domain/report.model';
import type { IReportRepository } from '../repositories/report.repository';
import { calculateBudgetReport } from './calculate-budget-report';

export class GetBudgetReportUseCase {
  constructor(private readonly repository: IReportRepository) {}

  async execute(
    filters: BudgetReportFilters,
    options: { weekStartsOn?: 0 | 1 } = {},
  ): Promise<BudgetReport> {
    const source = await this.repository.getBudgetReportSource(filters);
    return calculateBudgetReport(source, filters, options);
  }
}
