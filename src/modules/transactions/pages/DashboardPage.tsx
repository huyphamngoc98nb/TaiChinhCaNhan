import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Bell, Eye, EyeOff, WalletCards, AlertTriangle, ShieldCheck, TrendingDown } from 'lucide-react';
import { ROUTES } from '@/shared/constants/routes';
import { useBudgetAnalysis } from '../hooks/useBudgetAnalysis';
import { useRecurringReminders } from '../hooks/useRecurringReminders';
import { useTransactionSummary } from '../hooks/useTransactionSummary';
import { useWalletBalances } from '../hooks/useWalletBalances';
import { useCreditCardAlerts } from '@/modules/wallets/hooks/useCreditCardAlerts';
import { formatVND } from '../services/build-dashboard-view-model';
import type { AccountType } from '@/modules/wallets/repositories/wallet.repository';
import { filterWalletsWithValue } from '@/modules/wallets/services/wallet-selectors';
import { useLanguage } from '@/shared/context/LanguageContext';
import { CategoryIcon } from '@/modules/categories/components/CategoryIcon';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { useMonthEndForecast } from '../hooks/useMonthEndForecast';
import { buildDateRange } from '@/modules/reports/services/build-date-range';
import { resolveBudgetTransactionFilter } from '@/modules/reports/services/financial-calculations';
import type { BudgetProgress } from '@/modules/budgets/domain/budget.model';
import { useLoans } from '@/modules/loans/hooks/useLoans';
import { buildDebtDashboardSummary } from '@/modules/debts/services/debt-status';
import { getCreditCardStatementPeriod } from '@/modules/wallets/services/credit-card.service';

// ── helpers ────────────────────────────────────────────────────────────────────
const ACCOUNT_TYPE_ICON: Record<AccountType, string> = {
  cash:        '💵',
  bank:        '🏦',
  credit_card: '💳',
  e_wallet:    '📱',
  debt_or_loan: '🧾',
  investment:  '📈',
  other:       '🗂️',
};

const STATUS_GRADIENT: Record<'safe' | 'warning' | 'exceeded', string> = {
  safe:     'from-emerald-400 to-emerald-500',
  warning:  'from-amber-400 to-orange-400',
  exceeded: 'from-red-400 to-rose-500',
};

const STATUS_BG: Record<'safe' | 'warning' | 'exceeded', string> = {
  safe:     'bg-emerald-50',
  warning:  'bg-amber-50',
  exceeded: 'bg-red-50',
};

// ── component ────────────────────────────────────────────────────────────
function DashboardPage() {
  const { t } = useLanguage();
  const {
    totalIncome,
    totalExpense,
    loading: summaryLoading,
  } = useTransactionSummary();
  const {
    topBudgets,
    allProgress,
    loading: budgetLoading,
  } = useBudgetAnalysis();
  const {
    hasBills,
    overdueBillCount,
    reminders,
  } = useRecurringReminders();
  const {
    totalBalance,
    totalAssets,
    totalCreditCardLiability,
    wallets,
    loading: walletLoading,
  } = useWalletBalances();
  const {
    forecast,
    loading: forecastLoading,
  } = useMonthEndForecast(totalBalance, allProgress);
  const { loans, loading: loansLoading } = useLoans();
  const { alerts: creditCardAlerts } = useCreditCardAlerts(wallets);
  const navigate = useNavigate();
  const { showAmounts, setShowAmounts } = useAmountVisibility();
  const valuedWallets = filterWalletsWithValue(wallets);
  const showEmptyState =
    !walletLoading &&
    !loansLoading &&
    wallets.length === 0 &&
    loans.length === 0 &&
    topBudgets.length === 0 &&
    creditCardAlerts.length === 0;
  const primaryCreditCardAlert = creditCardAlerts[0];
  const overdueCreditCardCount = creditCardAlerts.filter(
    (alert) => alert.type === 'overdue'
  ).length;
  const creditCardAlertStyle =
    primaryCreditCardAlert?.type === 'overdue'
      ? {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          text: 'text-red-600',
        }
      : primaryCreditCardAlert?.type === 'over_limit'
        ? {
            bg: 'bg-orange-50',
            border: 'border-orange-200',
            icon: 'text-orange-500',
            text: 'text-orange-600',
          }
        : {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            icon: 'text-amber-500',
            text: 'text-amber-600',
          };
  const debtSummary = useMemo(() => buildDebtDashboardSummary({
    creditCards: wallets
      .filter((wallet) => wallet.account_type === 'credit_card' && wallet.is_active === 1)
      .map((wallet) => ({
        wallet,
        outstandingBalance: Math.max(0, -Number(wallet.balance || 0)),
        period: getCreditCardStatementPeriod(wallet),
      })),
    loans: loans.filter((loan) => loan.deleted_at == null && loan.status !== 'cancelled'),
  }), [wallets, loans]);
  const debtSummaryLoading = walletLoading || loansLoading;
  const hasDebtSummary =
    debtSummary.totalCurrentDebt > 0 ||
    debtSummary.totalCreditCardDebt > 0 ||
    debtSummary.dueWithinSevenDays > 0 ||
    debtSummary.overdueCount > 0 ||
    debtSummary.highUtilizationCount > 0;

  function toggleShowAmounts() {
    setShowAmounts(!showAmounts);
  }

  function displayAmount(value: number, prefix = '') {
    return showAmounts ? `${prefix}₫${formatVND(value)}` : HIDDEN_AMOUNT;
  }

  function openBudgetTransactions(progress: BudgetProgress) {
    const range = buildDateRange(progress.budget.period === 'weekly' ? 'this_week' : 'this_month');
    navigate(ROUTES.TRANSACTIONS, {
      state: {
        filter: {
          ...resolveBudgetTransactionFilter(progress.budget),
          startDate: range.startDate,
          endDate: range.endDate,
        },
        title: progress.budget.category_name,
      },
    });
  }

  const forecastStyle = forecast?.status === 'danger'
    ? {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-500',
        pill: 'bg-red-100 text-red-700',
        Icon: AlertTriangle,
        label: t('dashboard.forecast_status_danger'),
      }
    : forecast?.status === 'warning'
      ? {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'text-amber-500',
          pill: 'bg-amber-100 text-amber-700',
          Icon: TrendingDown,
          label: t('dashboard.forecast_status_warning'),
        }
      : {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          icon: 'text-emerald-500',
          pill: 'bg-emerald-100 text-emerald-700',
          Icon: ShieldCheck,
          label: t('dashboard.forecast_status_safe'),
        };
  const ForecastIcon = forecastStyle.Icon;

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-24">

      {/* ── Hero Card ─────────────────────────────────────────────── */}
      <div
        className="relative mx-4 mt-6 rounded-[24px] p-5 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 60%, #A78BFA 100%)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
        }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-white/10" />

        <div className="relative z-10 mb-1 flex items-center justify-between">
          <p className="text-white/70 text-[12px] font-medium">{t('dashboard.total_balance')}</p>
          <button
            type="button"
            onClick={toggleShowAmounts}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white active:scale-95"
            aria-label={showAmounts ? t('dashboard.hide_balance') : t('dashboard.show_balance')}
            title={showAmounts ? t('dashboard.hide_balance') : t('dashboard.show_balance')}
          >
            {showAmounts ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {walletLoading ? (
          <div className="h-9 w-40 bg-white/20 rounded-lg animate-pulse mb-3" />
        ) : (
          <h2 className="text-white text-[32px] font-bold tracking-tight mb-3">
            {displayAmount(totalBalance)}
          </h2>
        )}

        <div className="flex gap-2 flex-wrap">
          {valuedWallets.slice(0, 4).map(w => (
            <div
              key={w.id}
              className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1"
            >
              <span className="text-[13px]">
                {w.icon || ACCOUNT_TYPE_ICON[w.account_type]}
              </span>
              <span className="text-white text-[11px] font-semibold">{w.name}</span>
              <span className="text-white/70 text-[11px]">{displayAmount(w.balance)}</span>
            </div>
          ))}
          {valuedWallets.length > 4 && (
            <div className="flex items-center bg-white/15 rounded-full px-3 py-1">
              <span className="text-white/70 text-[11px]">+{valuedWallets.length - 4} {t('dashboard.wallet_count_suffix')}</span>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[14px] bg-white/15 px-3 py-2">
            <p className="text-white/60 text-[10px] font-medium">{t('dashboard.total_assets')}</p>
            <p className="text-white text-[13px] font-bold">
              {walletLoading ? '...' : displayAmount(totalAssets)}
            </p>
          </div>
          <div className="rounded-[14px] bg-white/15 px-3 py-2">
            <p className="text-white/60 text-[10px] font-medium">{t('dashboard.credit_card_liability')}</p>
            <p className="text-white text-[13px] font-bold">
              {walletLoading ? '...' : displayAmount(totalCreditCardLiability, '-')}
            </p>
          </div>
          <div className="rounded-[14px] bg-white/15 px-3 py-2">
            <p className="text-white/60 text-[10px] font-medium">{t('dashboard.income_this_month')}</p>
            <p className="text-white text-[13px] font-bold">
              {summaryLoading ? '...' : displayAmount(totalIncome, '+')}
            </p>
          </div>
          <div className="rounded-[14px] bg-white/15 px-3 py-2">
            <p className="text-white/60 text-[10px] font-medium">{t('dashboard.expense_this_month')}</p>
            <p className="text-white text-[13px] font-bold">
              {summaryLoading ? '...' : displayAmount(totalExpense, '-')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bill Reminders banner ────────────────────────────────────────── */}
      <div className={`mx-4 mt-4 rounded-[18px] border p-4 shadow-sm ${forecastStyle.bg} ${forecastStyle.border}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ForecastIcon size={18} className={`${forecastStyle.icon} shrink-0`} />
            <h3 className="truncate text-[15px] font-bold text-gray-900">{t('dashboard.forecast_title')}</h3>
          </div>
          {!forecastLoading && forecast && forecast.hasCurrentData && (
            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${forecastStyle.pill}`}>
              {forecastStyle.label}
            </span>
          )}
        </div>

        {forecastLoading || walletLoading ? (
          <div className="space-y-3">
            <div className="h-7 w-44 rounded-lg bg-white/70 animate-pulse" />
            <div className="h-4 w-full rounded bg-white/70 animate-pulse" />
          </div>
        ) : forecast && forecast.hasCurrentData ? (
          <>
            <p className="text-[12px] font-semibold text-gray-500">{t('dashboard.forecast_projected_balance')}</p>
            <p className="mt-1 break-words text-[26px] font-bold leading-tight text-gray-900 tabular-nums">
              {displayAmount(forecast.projectedMonthEndBalance)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[12px] bg-white/70 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-gray-400">{t('dashboard.forecast_daily_average_expense')}</p>
                <p className="mt-1 text-[13px] font-bold text-gray-800 tabular-nums">
                  {displayAmount(forecast.dailyAverageExpense)}
                </p>
              </div>
              <div className="rounded-[12px] bg-white/70 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-gray-400">{t('dashboard.forecast_projected_expense')}</p>
                <p className="mt-1 text-[13px] font-bold text-gray-800 tabular-nums">
                  {displayAmount(forecast.projectedMonthlyExpense)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-gray-600">
              {t('dashboard.forecast_elapsed_days')
                .replace('{elapsedDays}', String(forecast.elapsedDays))
                .replace('{daysInMonth}', String(forecast.daysInMonth))}
            </p>
          </>
        ) : (
          <div className="rounded-[14px] bg-white/70 px-4 py-5 text-center">
            <p className="text-[14px] font-semibold text-gray-800">{t('dashboard.forecast_empty_title')}</p>
            <p className="mt-1 text-[12px] leading-5 text-gray-500">
              {t('dashboard.forecast_empty_hint')}
            </p>
          </div>
        )}
      </div>

      {hasBills && (
        <div
          className="mx-4 mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-[16px] px-4 py-3 cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate(ROUTES.RECURRING_BILLS)}
        >
          <Bell size={18} className="text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-gray-900">
              {reminders.length} {t('dashboard.bills_due_soon')}
            </p>
            <p className="text-[11px] text-amber-600">
              {overdueBillCount > 0
                ? `${overdueBillCount} ${t('dashboard.overdue_count')}`
                : t('dashboard.tap_to_view_details')}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </div>
      )}

      {/* ── Credit card alert banner ────────────────────────────────────── */}
      {primaryCreditCardAlert && (
        <div
          className={`mx-4 mt-4 flex items-center gap-3 rounded-[16px] border px-4 py-3 cursor-pointer active:scale-[0.98] transition-transform ${creditCardAlertStyle.bg} ${creditCardAlertStyle.border}`}
          onClick={() => navigate(ROUTES.WALLETS)}
        >
          <Bell size={18} className={`${creditCardAlertStyle.icon} shrink-0`} />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-gray-900">
              {creditCardAlerts.length} {t('dashboard.credit_card_alerts')}
            </p>
            <p className={`text-[11px] ${creditCardAlertStyle.text}`}>
              {overdueCreditCardCount > 0
                ? `${overdueCreditCardCount} ${t('dashboard.credit_card_overdue_count')}`
                : primaryCreditCardAlert.type === 'due_soon'
                  ? t('dashboard.credit_card_due_soon')
                  : t('dashboard.credit_card_over_limit')}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </div>
      )}

      {(debtSummaryLoading || hasDebtSummary) && (
        <div
          className="mx-4 mt-4 rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm transition-transform active:scale-[0.99]"
          onClick={() => navigate(ROUTES.LOANS)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => event.key === 'Enter' && navigate(ROUTES.LOANS)}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <AlertTriangle size={18} className="shrink-0 text-slate-500" />
              <h3 className="truncate text-[15px] font-bold text-gray-900">
                {t('dashboard.debt_summary_title')}
              </h3>
            </div>
            {!debtSummaryLoading && debtSummary.alertCount > 0 && (
              <span className="shrink-0 rounded-full bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-700">
                {debtSummary.alertCount}
              </span>
            )}
          </div>

          {debtSummaryLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-[58px] animate-pulse rounded-[12px] bg-gray-100" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[12px] bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase text-gray-400">{t('dashboard.total_current_debt')}</p>
                  <p className="mt-1 text-[13px] font-bold text-gray-900 tabular-nums">
                    {displayAmount(debtSummary.totalCurrentDebt)}
                  </p>
                </div>
                <div className="rounded-[12px] bg-orange-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase text-orange-400">{t('dashboard.due_next_7_days')}</p>
                  <p className="mt-1 text-[13px] font-bold text-orange-700 tabular-nums">
                    {debtSummary.dueWithinSevenDays > 0
                      ? displayAmount(debtSummary.dueWithinSevenDays)
                      : t('dashboard.no_debt_due')}
                  </p>
                </div>
                <div className="rounded-[12px] bg-rose-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase text-rose-400">{t('dashboard.overdue_items')}</p>
                  <p className="mt-1 text-[13px] font-bold text-rose-700">
                    {debtSummary.overdueCount}
                  </p>
                </div>
                <div className="rounded-[12px] bg-amber-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase text-amber-500">{t('dashboard.high_utilization_cards')}</p>
                  <p className="mt-1 text-[13px] font-bold text-amber-700">
                    {debtSummary.highUtilizationCount}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] font-semibold text-gray-400">
                {t('dashboard.credit_card_liability')}: {displayAmount(debtSummary.totalCreditCardDebt)}
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Budget Mini-cards ────────────────────────────────────────────── */}
      {!budgetLoading && topBudgets.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <h3 className="text-[15px] font-bold text-gray-900">{t('navigation.budgets')}</h3>
            <button
              onClick={() => navigate(ROUTES.BUDGETS)}
              className="text-[12px] text-indigo-500 font-semibold flex items-center gap-0.5"
            >
              {t('common.see_all')} <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4">
            {topBudgets.map(p => (
              <div
                key={p.budget.category_id}
                onClick={() => openBudgetTransactions(p)}
                className={`rounded-[18px] p-4 cursor-pointer active:scale-95 transition-transform ${STATUS_BG[p.status]}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[22px] bg-gradient-to-br ${STATUS_GRADIENT[p.status]} shadow-sm`}
                  >
                    <CategoryIcon
                      icon={p.budget.icon}
                      name={p.budget.category_name}
                      type={p.budget.category_type}
                      size={22}
                      className="text-white leading-none"
                    />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${STATUS_GRADIENT[p.status]} text-white`}
                  >
                    {Math.round(p.percentage * 100)}%
                  </span>
                </div>
                <p className="text-[12px] font-semibold text-gray-800 leading-tight mb-2 truncate">
                  {p.budget.category_name}
                </p>
                <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${STATUS_GRADIENT[p.status]}`}
                    style={{ width: `${Math.min(p.percentage * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5 truncate">
                  {t('dashboard.remaining')} {displayAmount(Math.max(p.remaining_amount, 0))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {showEmptyState && (
        <div className="flex flex-col items-center justify-center mt-16 px-8 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
            <WalletCards size={28} />
          </div>
          <h3 className="text-[18px] font-bold text-gray-900">{t('dashboard.empty_wallet_title')}</h3>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            {t('dashboard.empty_wallet_hint')}
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.WALLETS_NEW)}
            className="h-11 rounded-[12px] bg-indigo-500 px-5 text-[14px] font-semibold text-white shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            {t('dashboard.create_wallet')}
          </button>
        </div>
      )}
    </div>
  );
}

export { DashboardPage };
