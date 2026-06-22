import { IReportRepository } from '../repositories/report.repository';
import { DateRange, PeriodSummary, ReportGranularity } from '../domain/report.model';
import {
  DEFAULT_DISPLAY_FORMAT_SETTINGS,
  type DisplayFormatSettings,
} from '@/modules/settings/services/display-format-settings.service';
import { getWeekDateRange, toDateKey } from '@/shared/utils/date-range';

function parseDayPeriod(period: string): Date | null {
  const [year, month, day] = period.split('-').map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function aggregateDailyByWeek(
  dailySummary: PeriodSummary[],
  displayFormatSettings: DisplayFormatSettings
): PeriodSummary[] {
  const grouped = new Map<string, PeriodSummary>();

  dailySummary.forEach((item) => {
    const periodDate = parseDayPeriod(item.period);
    const period = periodDate
      ? toDateKey(new Date(getWeekDateRange(periodDate, displayFormatSettings).startDate))
      : item.period;
    const existing = grouped.get(period);

    if (existing) {
      existing.income += item.income || 0;
      existing.expense += item.expense || 0;
      return;
    }

    grouped.set(period, {
      period,
      income: item.income || 0,
      expense: item.expense || 0,
    });
  });

  return [...grouped.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export class GetPeriodSummaryUseCase {
  constructor(private repository: IReportRepository) {}

  async execute(
    range: DateRange,
    granularity: ReportGranularity,
    displayFormatSettings: DisplayFormatSettings = DEFAULT_DISPLAY_FORMAT_SETTINGS
  ) {
    if (granularity === 'week') {
      const dailySummary = await this.repository.getPeriodSummary(range, 'day');
      return aggregateDailyByWeek(dailySummary, displayFormatSettings);
    }

    return this.repository.getPeriodSummary(range, granularity);
  }
}
