import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appRepositories } from '@/core/repositories/app-repositories';
import type { Category } from '@/modules/categories/domain/category.model';
import type { Wallet } from '@/modules/wallets/repositories/wallet.repository';
import { BackButton } from '@/shared/components/BackButton';
import { ROUTES } from '@/shared/constants/routes';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import { getAppLocale } from '@/shared/utils/locale';
import type { BudgetReport, BudgetReportStatus, DateRange } from '../domain/report.model';
import { BudgetCategoryBreakdown } from '../components/BudgetCategoryBreakdown';
import { BudgetReportFilters } from '../components/BudgetReportFilters';
import { BudgetReportSummary } from '../components/BudgetReportSummary';
import { BudgetReportEmptyStates } from '../components/BudgetReportEmptyStates';
import { BudgetSpendingTrend } from '../components/BudgetSpendingTrend';
import { buildDateRange, type DateRangePreset } from '../services/build-date-range';
import { GetBudgetReportUseCase } from '../services/get-budget-report';

export function BudgetReportPage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const displayFormatSettings = useDisplayFormatSettings();
  const locale = getAppLocale(language);
  const displayAmount = (amount: number) => showAmounts ? formatAmount(amount, locale) : HIDDEN_AMOUNT;

  const [preset, setPreset] = useState<DateRangePreset>('this_month');
  const [customRange, setCustomRange] = useState<DateRange>(() => buildDateRange('this_month'));
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [status, setStatus] = useState<'' | BudgetReportStatus>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [report, setReport] = useState<BudgetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const useCase = useMemo(() => new GetBudgetReportUseCase(appRepositories.report), []);
  const range = useMemo(
    () => buildDateRange(preset, customRange, displayFormatSettings),
    [customRange, displayFormatSettings, preset],
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([
      appRepositories.category.list('expense'),
      appRepositories.wallet.getAllActive(),
    ]).then(([categoryRows, walletRows]) => {
      if (!mounted) return;
      setCategories(categoryRows);
      setWallets(walletRows);
    }).catch(() => {
      // The report remains usable without option labels; data loading reports its own errors.
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    useCase.execute(
      {
        range,
        categoryId: categoryId || undefined,
        walletId: walletId || undefined,
        status: status || undefined,
      },
      { weekStartsOn: displayFormatSettings.weekStart === 'sunday' ? 0 : 1 },
    ).then((nextReport) => {
      if (mounted) setReport(nextReport);
    }).catch((cause: unknown) => {
      if (!mounted) return;
      setError(cause instanceof Error ? cause.message : t('budget_report.load_failed'));
    }).finally(() => {
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; };
  }, [categoryId, displayFormatSettings.weekStart, range, reloadKey, status, t, useCase, walletId]);

  return (
    <div className="mx-auto min-h-full max-w-4xl bg-bg p-4 pb-24 text-text">
      <header className="mb-4 flex items-center gap-3">
        <BackButton onClick={() => navigate(ROUTES.HOME)} ariaLabel={t('common.back')} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">{t('budget_report.title')}</h1>
          <p className="mt-0.5 text-sm text-muted">{t('budget_report.subtitle')}</p>
        </div>
      </header>

      <BudgetReportFilters
        preset={preset}
        customRange={customRange}
        categoryId={categoryId}
        walletId={walletId}
        status={status}
        categories={categories}
        wallets={wallets}
        onPresetChange={setPreset}
        onCustomRangeChange={setCustomRange}
        onCategoryChange={setCategoryId}
        onWalletChange={setWalletId}
        onStatusChange={setStatus}
      />

      {loading && (
        <div className="rounded-[16px] border border-border bg-surface p-5 text-sm text-muted shadow-sm">
          {t('budget_report.loading')}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-[16px] border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">{t('budget_report.load_failed')}</h2>
              <p className="mt-1 break-words text-sm">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-[10px] bg-red-600 px-4 text-sm font-bold text-white"
          >
            <RefreshCcw size={16} />
            {t('budget_report.retry')}
          </button>
        </div>
      )}

      {!loading && !error && report && (
        <>
          <BudgetReportSummary report={report} displayAmount={displayAmount} />

          <BudgetReportEmptyStates
            hasBudget={report.hasBudget}
            hasSpending={report.hasSpending}
            onConfigureBudget={() => navigate(ROUTES.BUDGETS)}
          />

          <BudgetSpendingTrend
            data={report.trend}
            granularity={report.trendGranularity}
            displayAmount={displayAmount}
          />
          <BudgetCategoryBreakdown categories={report.categories} displayAmount={displayAmount} />

          {report.categories.length === 0 && (report.hasBudget || report.hasSpending) && (
            <div className="rounded-[16px] border border-border bg-surface p-5 text-center text-sm text-muted">
              {t('budget_report.no_matching_status')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
