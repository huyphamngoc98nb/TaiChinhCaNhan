import { useState, useEffect } from 'react';
import { GetCashflowSummaryUseCase } from '../services/get-cashflow-summary';
import { GetCategorySummaryUseCase } from '../services/get-category-summary';
import { GetPeriodSummaryUseCase } from '../services/get-period-summary';
import { buildDateRange, DateRangePreset } from '../services/build-date-range';
import { ReportGranularity, CashflowSummary, CategorySummary, DateRange, PeriodSummary, WalletSummary } from '../domain/report.model';

import { ReportSummaryCards } from '../components/ReportSummaryCards';
import { DateRangePicker } from '../components/DateRangePicker';
import { CashflowBarChart } from '../components/CashflowBarChart';
import { ReportDonutCard } from '../components/ReportDonutCard';

import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { AlertTriangle, CalendarDays, FileText, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { appRepositories } from '@/core/repositories/app-repositories';
import { getAppLocale } from '@/shared/utils/locale';

const EXPENSE_DONUT_COLORS = ['#E11D48', '#F97316', '#F59E0B', '#A855F7', '#EC4899', '#64748B'];
const INCOME_DONUT_COLORS = ['#059669', '#14B8A6', '#0EA5E9', '#6366F1', '#84CC16', '#64748B'];

export const ReportsPage = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const locale = getAppLocale(language);

  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [granularity, setGranularity] = useState<ReportGranularity>('day');
  const [customRange, setCustomRange] = useState<DateRange>(() => buildDateRange('this_month'));

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
      return new Date(year, month - 1, day).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
      });
    }
    if (parts.length === 2) {
      const [year, month] = parts.map(Number);
      if (month >= 1 && month <= 12) {
        return new Date(year, month - 1, 1).toLocaleDateString(locale, {
          month: 'short',
          year: 'numeric',
        });
      }
    }
    return period;
  };

  const resetFilters = () => {
    setPreset('this_month');
    setGranularity('day');
    setCustomRange(buildDateRange('this_month'));
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const repo = appRepositories.report;
        const range = buildDateRange(preset, customRange);
        const previousRange = buildPreviousRange(range);

        const [cashflowRes, previousCashflowRes, expensesRes, incomesRes, periodRes, dailyRes, walletRes] = await Promise.all([
          new GetCashflowSummaryUseCase(repo).execute(range),
          new GetCashflowSummaryUseCase(repo).execute(previousRange),
          new GetCategorySummaryUseCase(repo).execute(range, 'expense'),
          new GetCategorySummaryUseCase(repo).execute(range, 'income'),
          new GetPeriodSummaryUseCase(repo).execute(range, granularity),
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
  }, [preset, granularity, customRange, t]);

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
      icon: TrendingUp,
    },
    {
      label: t('reports.insight_highest_day'),
      value: highestDay ? formatPeriodLabel(highestDay.period) : t('reports.no_data'),
      detail: highestDay ? formatAmount(highestDay.expense, locale) : '',
      icon: CalendarDays,
    },
    {
      label: t('reports.insight_top_wallet'),
      value: topWallet ? topWallet.wallet_name : t('reports.no_data'),
      detail: topWallet ? formatAmount(topWallet.amount, locale) : '',
      icon: WalletCards,
    },
    {
      label: t('reports.insight_unusual_transaction'),
      value: unusualDay ? formatPeriodLabel(unusualDay.period) : t('reports.no_unusual_transaction'),
      detail: unusualDay ? t('reports.unusual_transaction_detail') : '',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl p-4 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <button
          onClick={() => navigate(ROUTES.EXPORT)}
          aria-label={t('reports.export')}
          title={t('reports.export')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-colors active:bg-gray-200"
        >
          <FileText size={19} />
        </button>
      </div>

      <DateRangePicker
        preset={preset}
        granularity={granularity}
        customRange={customRange}
        onPresetChange={setPreset}
        onGranularityChange={setGranularity}
        onCustomRangeChange={setCustomRange}
        onReset={resetFilters}
      />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200">
          <p className="font-semibold">{t('reports.error_title')}</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="mb-5 rounded-[18px] bg-white p-5 text-sm text-gray-500 shadow-sm">{t('reports.loading_summaries')}</div>
      ) : (
        <div className="mb-4 rounded-[18px] bg-gray-900 p-5 text-white shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[12px] font-semibold uppercase text-gray-300">{t('reports.net_balance_this_period')}</div>
            <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-bold ${netChange >= 0 ? 'bg-emerald-400/15 text-emerald-200' : 'bg-red-400/15 text-red-200'}`}>
              {netChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {formatPercent(netChange)}
            </div>
          </div>
          <div className="break-words text-3xl font-bold leading-tight tabular-nums">
            {formatAmount(cashflow ? net : 0, locale)}
          </div>
          <div className="mt-3 text-sm leading-5 text-gray-200">{mainInsight}</div>
        </div>
      )}

      <ReportSummaryCards data={cashflow} previousData={previousCashflow} loading={loading} />

      <div className="space-y-6">
        {!loading && !error && <CashflowBarChart data={periodData} />}

        <ReportDonutCard
          title={t('reports.expense_by_category')}
          totalLabel={t('reports.total_expense')}
          emptyMessage={t('reports.no_expense_data')}
          items={expenses.map(item => ({ label: item.category_name, amount: item.amount }))}
          palette={EXPENSE_DONUT_COLORS}
          loading={loading}
          error={error}
          ariaLabel={t('reports.expense_by_category')}
        />

        <ReportDonutCard
          title={t('reports.income_by_source')}
          totalLabel={t('reports.total_income')}
          emptyMessage={t('reports.no_income_data')}
          items={incomes.map(item => ({ label: item.category_name, amount: item.amount }))}
          palette={INCOME_DONUT_COLORS}
          loading={loading}
          error={error}
          ariaLabel={t('reports.income_by_source')}
        />

        {!loading && !error && (
          <div className="space-y-2">
            {insightItems.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-[14px] border border-gray-100 bg-white p-3 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold uppercase text-gray-400">{item.label}</div>
                    <div className="truncate text-[14px] font-bold text-gray-900">{item.value}</div>
                  </div>
                  {item.detail && <div className="max-w-[38%] text-right text-[12px] font-semibold text-gray-500">{item.detail}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
