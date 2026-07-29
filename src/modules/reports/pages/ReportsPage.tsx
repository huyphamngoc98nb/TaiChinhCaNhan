/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
/*
 * Hallmark · genre: utilitarian · macrostructure: Stat-Led
 * design-system: design.md · designed-as-app · enrichment: none
 */
import { useState, useEffect } from 'react';
import { GetCashflowSummaryUseCase } from '../services/get-cashflow-summary';
import { GetCategorySummaryUseCase } from '../services/get-category-summary';
import { GetPeriodSummaryUseCase } from '../services/get-period-summary';
import { buildDateRange, DateRangePreset } from '../services/build-date-range';
import { ReportGranularity, CashflowSummary, CategorySummary, DateRange, PeriodSummary, WalletSummary } from '../domain/report.model';

import { ReportSummaryCards } from '../components/ReportSummaryCards';
import { DateRangePicker } from '../components/DateRangePicker';
import { CashflowTrendChart } from '../components/CashflowTrendChart';
import { ReportDonutCard } from '../components/ReportDonutCard';
import { ReportTypeTabs } from '../components/ReportTypeTabs';

import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { BackButton } from '@/shared/components/BackButton';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  FileText,
  PlusCircle,
  Tags,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { appRepositories } from '@/core/repositories/app-repositories';
import { getAppLocale } from '@/shared/utils/locale';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import { formatAppDate, formatAppMonth } from '@/shared/utils/display-format';

const EXPENSE_DONUT_COLORS = [
  'var(--chart-expense)',
  'var(--warning)',
  'var(--chart-series-5)',
  'var(--chart-series-4)',
  'var(--primary)',
  'var(--success)',
  'var(--danger)',
  'var(--chart-net)',
];
const INCOME_DONUT_COLORS = [
  'var(--chart-income)',
  'var(--chart-series-4)',
  'var(--chart-net)',
  'var(--chart-series-5)',
  'var(--success)',
  'var(--primary)',
  'var(--warning)',
  'var(--chart-muted)',
];

const focusRingClasses =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring-offset)]';

function ReportsPageSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-6" role="status" aria-label={label}>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface" aria-hidden="true">
        <div className="space-y-3 p-4">
          <div className="h-4 w-32 rounded bg-surface-muted" />
          <div className="h-9 w-52 max-w-full rounded bg-surface-muted" />
          <div className="h-4 w-48 max-w-full rounded bg-surface-muted" />
        </div>
        <div className="grid grid-cols-1 divide-y divide-border border-t border-border min-[360px]:grid-cols-2 min-[360px]:divide-x min-[360px]:divide-y-0">
          {[0, 1].map(item => (
            <div key={item} className="space-y-2 p-4">
              <div className="h-4 w-20 rounded bg-surface-muted" />
              <div className="h-7 w-32 max-w-full rounded bg-surface-muted" />
              <div className="h-4 w-24 rounded bg-surface-muted" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4" aria-hidden="true">
        <div className="h-5 w-40 rounded bg-surface-muted" />
        <div className="mt-4 h-56 rounded-xl bg-surface-muted" />
      </div>

      <div className="space-y-3" aria-hidden="true">
        <div className="h-5 w-36 rounded bg-surface-muted" />
        <div className="h-80 rounded-2xl border border-border bg-surface p-4">
          <div className="mx-auto h-48 w-48 rounded-full border-[24px] border-surface-muted" />
        </div>
      </div>
    </div>
  );
}

export const ReportsPage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const displayFormatSettings = useDisplayFormatSettings();
  const locale = getAppLocale(language);
  const displayAmount = (amount: number) => showAmounts ? formatAmount(amount, locale) : HIDDEN_AMOUNT;

  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [granularity, setGranularity] = useState<ReportGranularity>('day');
  const [customRange, setCustomRange] = useState<DateRange>(() =>
    buildDateRange('this_month', undefined, displayFormatSettings)
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cashflow, setCashflow] = useState<CashflowSummary | null>(null);
  const [previousCashflow, setPreviousCashflow] = useState<CashflowSummary | null>(null);
  const [expenses, setExpenses] = useState<CategorySummary[]>([]);
  const [incomes, setIncomes] = useState<CategorySummary[]>([]);
  const [periodData, setPeriodData] = useState<PeriodSummary[]>([]);
  const [dailyData, setDailyData] = useState<PeriodSummary[]>([]);
  const [walletData, setWalletData] = useState<WalletSummary[]>([]);

  const buildPreviousRange = (range: DateRange): DateRange => {
    const duration = range.endDate - range.startDate + 1;
    return {
      startDate: range.startDate - duration,
      endDate: range.startDate - 1,
    };
  };

  const percentChange = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;

  const formatPeriodLabel = (period: string) => {
    const parts = period.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      return formatAppDate(
        new Date(year, month - 1, day).getTime(),
        displayFormatSettings
      );
    }
    if (parts.length === 2) {
      const [year, month] = parts.map(Number);
      if (month >= 1 && month <= 12) {
        return formatAppMonth(
          new Date(year, month - 1, 1).getTime(),
          displayFormatSettings,
          locale
        );
      }
    }
    return period;
  };

  const resetFilters = () => {
    setPreset('this_month');
    setGranularity('day');
    setCustomRange(buildDateRange('this_month', undefined, displayFormatSettings));
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const repo = appRepositories.report;
        const range = buildDateRange(preset, customRange, displayFormatSettings);
        const previousRange = buildPreviousRange(range);

        const [cashflowRes, previousCashflowRes, expensesRes, incomesRes, periodRes, dailyRes, walletRes] = await Promise.all([
          new GetCashflowSummaryUseCase(repo).execute(range),
          new GetCashflowSummaryUseCase(repo).execute(previousRange),
          new GetCategorySummaryUseCase(repo).execute(range, 'expense'),
          new GetCategorySummaryUseCase(repo).execute(range, 'income'),
          new GetPeriodSummaryUseCase(repo).execute(range, granularity, displayFormatSettings),
          new GetPeriodSummaryUseCase(repo).execute(range, 'day'),
          repo.getWalletSummary(range),
        ]);

        if (isMounted) {
          setCashflow(cashflowRes);
          setPreviousCashflow(previousCashflowRes);
          setExpenses(expensesRes);
          setIncomes(incomesRes);
          setPeriodData(periodRes);
          setDailyData(dailyRes);
          setWalletData(walletRes);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || t('reports.no_data'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [displayFormatSettings, preset, granularity, customRange, t]);

  const net = cashflow?.netAmount || 0;
  const previousNet = previousCashflow?.netAmount || 0;
  const netChange = percentChange(net, previousNet);
  const biggestCategory = expenses[0];
  const totalExpense = cashflow?.totalExpense || 0;
  const highestDay = dailyData.reduce<PeriodSummary | null>((top, item) => (
    !top || item.expense > top.expense ? item : top
  ), null);
  const topWallet = walletData[0];
  const averageDailyExpense = dailyData.length > 0
    ? dailyData.reduce((sum, item) => sum + item.expense, 0) / dailyData.length
    : 0;
  const unusualDay = highestDay && averageDailyExpense > 0 && highestDay.expense >= averageDailyExpense * 1.5
    ? highestDay
    : null;
  const mainInsight = biggestCategory
    ? t('reports.main_insight_category').replace('{category}', biggestCategory.category_name)
    : t('reports.main_insight_empty');
  const insightItems = [
    {
      label: t('reports.insight_top_category'),
      value: biggestCategory ? biggestCategory.category_name : t('reports.no_data'),
      detail: biggestCategory && totalExpense > 0 ? `${((biggestCategory.amount / totalExpense) * 100).toFixed(0)}% ${t('reports.of_period_expense')}` : '',
      icon: Tags,
    },
    {
      label: t('reports.insight_highest_day'),
      value: highestDay ? formatPeriodLabel(highestDay.period) : t('reports.no_data'),
      detail: highestDay ? displayAmount(highestDay.expense) : '',
      icon: CalendarDays,
    },
    {
      label: t('reports.insight_top_wallet'),
      value: topWallet ? topWallet.wallet_name : t('reports.no_data'),
      detail: topWallet ? displayAmount(topWallet.amount) : '',
      icon: WalletCards,
    },
    {
      label: t('reports.insight_unusual_day'),
      value: unusualDay ? formatPeriodLabel(unusualDay.period) : t('reports.no_unusual_transaction'),
      detail: unusualDay ? t('reports.unusual_transaction_detail') : '',
      icon: AlertTriangle,
    },
  ];
  const hasReportData = Boolean(
    cashflow &&
    (
      cashflow.totalIncome > 0 ||
      cashflow.totalExpense > 0 ||
      expenses.length > 0 ||
      incomes.length > 0 ||
      periodData.some(item => item.income > 0 || item.expense > 0)
    )
  );

  return (
    <div
      id="report-cashflow-content"
      className="mx-auto min-h-full max-w-4xl bg-bg px-4 pb-24 pt-[calc(1rem+env(safe-area-inset-top))] text-text sm:px-6"
      aria-busy={loading}
    >
      <header className="mb-4 flex min-h-11 items-center gap-2">
        <BackButton onClick={() => navigate(ROUTES.HOME)} ariaLabel={t('common.back')} />
        <div className="min-w-0 flex-1">
          <h1 className="min-w-0 text-xl font-bold leading-6 text-text [overflow-wrap:anywhere]">
            {t('reports.title')}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.EXPORT)}
          aria-label={t('reports.export')}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text transition-colors active:bg-surface-muted ${focusRingClasses}`}
        >
          <FileText size={20} aria-hidden="true" />
        </button>
      </header>

      <ReportTypeTabs
        active="cashflow"
        onChange={(value) => {
          if (value === 'budget') navigate(ROUTES.BUDGET_REPORT);
        }}
      />

      <DateRangePicker
        preset={preset}
        granularity={granularity}
        customRange={customRange}
        onPresetChange={setPreset}
        onGranularityChange={setGranularity}
        onCustomRangeChange={setCustomRange}
        onReset={resetFilters}
        disabled={loading}
      />

      {error ? (
        <section
          className="rounded-2xl border border-[var(--danger)] bg-[var(--negative-soft)] p-4"
          role="alert"
          aria-labelledby="reports-error-title"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-[var(--danger)]" size={20} aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="reports-error-title" className="text-base font-bold leading-5 text-text">
                {t('reports.error_title')}
              </h2>
              <p className="mt-2 break-words text-sm leading-5 text-text">{error}</p>
            </div>
          </div>
        </section>
      ) : loading ? (
        <ReportsPageSkeleton label={t('reports.loading_report')} />
      ) : !hasReportData ? (
        <section
          className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-surface px-5 py-10 text-center"
          aria-labelledby="reports-empty-title"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-primary">
            <BarChart3 size={24} aria-hidden="true" />
          </div>
          <h2 id="reports-empty-title" className="text-base font-bold leading-6 text-text">
            {preset === 'custom'
              ? t('reports.empty_custom_title')
              : t('reports.empty_title')}
          </h2>
          <p className="mt-2 max-w-sm text-base leading-6 text-muted">
            {preset === 'custom'
              ? t('reports.empty_custom_hint')
              : t('reports.empty_hint')}
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.TRANSACTIONS_NEW)}
            aria-label={t('transactions.add_title')}
            className={`mt-5 inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--action-primary-bg)] px-5 text-sm font-semibold text-[var(--action-primary-text)] transition-transform active:translate-y-px ${focusRingClasses}`}
          >
            <PlusCircle size={18} aria-hidden="true" />
            {t('transactions.add_title')}
          </button>
        </section>
      ) : (
        <div className="space-y-6">
          <section
            className="overflow-hidden rounded-2xl border border-border bg-surface"
            aria-labelledby="reports-overview-heading"
          >
            <div className="p-4">
              <h2 id="reports-overview-heading" className="text-base font-bold leading-5 text-text">
                {t('reports.overview_section')}
              </h2>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-muted">
                    {t('reports.net_balance_this_period')}
                  </p>
                  <p className={`mt-2 break-words text-[clamp(1.75rem,8vw,2rem)] font-bold leading-[1.15] tabular-nums ${
                    net > 0
                      ? 'text-[var(--success)]'
                      : net < 0
                        ? 'text-[var(--danger)]'
                        : 'text-text'
                  }`}>
                    {displayAmount(net)}
                  </p>
                </div>
                <div className={`flex shrink-0 items-center gap-1.5 text-sm font-semibold ${
                  netChange > 0
                    ? 'text-[var(--success)]'
                    : netChange < 0
                      ? 'text-[var(--danger)]'
                      : 'text-muted'
                }`}>
                  {netChange >= 0
                    ? <TrendingUp size={17} aria-hidden="true" />
                    : <TrendingDown size={17} aria-hidden="true" />}
                  <span>{formatPercent(netChange)}</span>
                  <span className="font-normal text-muted">
                    {t('reports.compared_with_previous_period')}
                  </span>
                </div>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-5 text-muted">{mainInsight}</p>
            </div>

            <ReportSummaryCards data={cashflow} previousData={previousCashflow} loading={false} />
          </section>

          <CashflowTrendChart data={periodData} />

          <section aria-labelledby="reports-breakdown-heading">
            <h2 id="reports-breakdown-heading" className="mb-3 text-base font-bold leading-5 text-text">
              {t('reports.breakdown_section')}
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
              <ReportDonutCard
                title={t('reports.expense_by_category')}
                totalLabel={t('reports.total_expense')}
                emptyMessage={t('reports.no_expense_data')}
                items={expenses.map(item => ({
                  id: item.category_id,
                  label: item.category_name,
                  amount: item.amount,
                }))}
                palette={EXPENSE_DONUT_COLORS}
                ariaLabel={t('reports.expense_by_category')}
                allowExclusion
              />

              <ReportDonutCard
                title={t('reports.income_by_source')}
                totalLabel={t('reports.total_income')}
                emptyMessage={t('reports.no_income_data')}
                items={incomes.map(item => ({
                  id: item.category_id,
                  label: item.category_name,
                  amount: item.amount,
                }))}
                palette={INCOME_DONUT_COLORS}
                ariaLabel={t('reports.income_by_source')}
              />
            </div>
          </section>

          <section
            className="rounded-2xl border border-border bg-surface p-4"
            aria-labelledby="reports-insights-heading"
          >
            <h2 id="reports-insights-heading" className="text-base font-bold leading-5 text-text">
              {t('reports.insights_section')}
            </h2>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 md:grid-cols-2">
              {insightItems.map(item => {
                const Icon = item.icon;
                const valueMayTruncate =
                  item.label === t('reports.insight_top_category')
                  || item.label === t('reports.insight_top_wallet');

                return (
                  <div key={item.label} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-t border-border py-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      item.label === t('reports.insight_unusual_day')
                        ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                        : 'bg-surface-muted text-muted'
                    }`}>
                      <Icon size={17} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold leading-4 text-muted">{item.label}</dt>
                      <dd className={`mt-1 text-sm font-bold leading-5 text-text ${
                        valueMayTruncate ? 'truncate' : 'break-words tabular-nums'
                      }`}>
                        {item.value}
                      </dd>
                      {item.detail && (
                        <dd className="mt-1 break-words text-xs font-semibold leading-4 text-muted tabular-nums">
                          {item.detail}
                        </dd>
                      )}
                    </div>
                  </div>
                );
              })}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
};
