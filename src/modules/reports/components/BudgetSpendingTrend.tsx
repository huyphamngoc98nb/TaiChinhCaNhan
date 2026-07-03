import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useLanguage } from '@/shared/context/LanguageContext';
import type { BudgetReportTrendPoint, ReportGranularity } from '../domain/report.model';

interface Props {
  data: BudgetReportTrendPoint[];
  granularity: ReportGranularity;
  displayAmount: (value: number) => string;
}

export function BudgetSpendingTrend({ data, granularity, displayAmount }: Props) {
  const { t } = useLanguage();
  if (data.length === 0) return null;

  return (
    <section className="mb-4 overflow-hidden rounded-[16px] border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-bold text-text">{t('budget_report.spending_trend')}</h2>
        <span className="text-xs font-semibold text-muted">{t(`reports.granularity_${granularity}`)}</span>
      </div>
      <div className="h-[220px] min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} minTickGap={24} />
            <Tooltip
              formatter={(value) => [displayAmount(Number(value ?? 0)), t('budget_report.actual_spending')]}
              contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}
            />
            <Area type="linear" dataKey="actualSpending" stroke="#4F46E5" strokeWidth={2.5} fill="#4F46E5" fillOpacity={0.12} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
