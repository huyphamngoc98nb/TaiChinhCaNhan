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
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';

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

const BUDGET_STATUS_STYLE: Record<'safe' | 'warning' | 'exceeded', {
  accent: string;
  fill: string;
  pill: string;
}> = {
  safe: {
    accent: 'text-[color:var(--success)]',
    fill: 'bg-[color:var(--success)]',
    pill: 'border-emerald-500/20 bg-emerald-500/10',
  },
  warning: {
    accent: 'text-[color:var(--warning)]',
    fill: 'bg-[color:var(--warning)]',
    pill: 'border-amber-500/20 bg-amber-500/10',
  },
  exceeded: {
    accent: 'text-[color:var(--danger)]',
    fill: 'bg-[color:var(--danger)]',
    pill: 'border-rose-500/20 bg-rose-500/10',
  },
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
    totalCreditCardLiability,
    totalNonCreditCardWalletBalance,
    wallets,
    loading: walletLoading,
  } = useWalletBalances();
  const {
    forecast,
    loading: forecastLoading,
  } = useMonthEndForecast(totalBalance, allProgress);
  const { loans, loading: loansLoading } = useLoans();
  const { alerts: creditCardAlerts } = useCreditCardAlerts(wallets);
  const displayFormatSettings = useDisplayFormatSettings();
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
          accent: 'text-[color:var(--danger)]',
          ring: 'ring-rose-500/15',
        }
      : primaryCreditCardAlert?.type === 'over_limit'
        ? {
            accent: 'text-[color:var(--warning)]',
            ring: 'ring-amber-500/15',
          }
        : {
            accent: 'text-[color:var(--warning)]',
            ring: 'ring-amber-500/15',
          };

  function toggleShowAmounts() {
    setShowAmounts(!showAmounts);
  }

  function displayAmount(value: number, prefix = '') {
    return showAmounts ? `${prefix}₫${formatVND(value)}` : HIDDEN_AMOUNT;
  }

  function openBudgetTransactions(progress: BudgetProgress) {
    const range = buildDateRange(
      progress.budget.period === 'weekly' ? 'this_week' : 'this_month',
      undefined,
      displayFormatSettings
    );
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
        accent: 'text-[color:var(--danger)]',
        pill: 'border border-rose-500/20 bg-rose-500/10 text-text',
        ring: 'ring-rose-500/15',
        Icon: AlertTriangle,
        label: t('dashboard.forecast_status_danger'),
      }
    : forecast?.status === 'warning'
      ? {
          accent: 'text-[color:var(--warning)]',
          pill: 'border border-amber-500/20 bg-amber-500/10 text-text',
          ring: 'ring-amber-500/15',
          Icon: TrendingDown,
          label: t('dashboard.forecast_status_warning'),
        }
      : {
          accent: 'text-[color:var(--success)]',
          pill: 'border border-emerald-500/20 bg-emerald-500/10 text-text',
          ring: 'ring-emerald-500/15',
          Icon: ShieldCheck,
          label: t('dashboard.forecast_status_safe'),
        };
  const ForecastIcon = forecastStyle.Icon;

  return (
    <div className="min-h-screen bg-bg pb-24 text-text">

      {/* ── Hero Card ─────────────────────────────────────────────── */}
      <div className="relative mx-4 mt-6 overflow-hidden rounded-[24px] border border-border bg-surface p-5 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

        <div className="relative z-10 mb-1 flex items-center justify-between">
          <p className="text-[12px] font-semibold text-muted">{t('dashboard.total_wallet_balance')}</p>
          <button
            type="button"
            onClick={toggleShowAmounts}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-muted transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={showAmounts ? t('dashboard.hide_balance') : t('dashboard.show_balance')}
            title={showAmounts ? t('dashboard.hide_balance') : t('dashboard.show_balance')}
          >
            {showAmounts ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {walletLoading ? (
          <div className="mb-3 h-9 w-40 animate-pulse rounded-lg bg-surface-muted" />
        ) : (
          <h2 className="mb-3 text-[32px] font-bold tracking-tight text-text">
            {displayAmount(totalNonCreditCardWalletBalance)}
          </h2>
        )}

        <div className="flex gap-2 flex-wrap">
          {valuedWallets.slice(0, 4).map(w => (
            <div
              key={w.id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-bg-subtle px-3 py-1"
            >
              <span className="text-[13px]">
                {w.icon || ACCOUNT_TYPE_ICON[w.account_type]}
              </span>
              <span className="text-[11px] font-semibold text-text">{w.name}</span>
              <span className="text-[11px] text-muted">{displayAmount(w.balance)}</span>
            </div>
          ))}
          {valuedWallets.length > 4 && (
            <div className="flex items-center rounded-full border border-border bg-bg-subtle px-3 py-1">
              <span className="text-[11px] text-muted">+{valuedWallets.length - 4} {t('dashboard.wallet_count_suffix')}</span>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[14px] bg-bg-subtle px-3 py-2">
            <p className="text-[10px] font-semibold text-muted">{t('dashboard.net_worth')}</p>
            <p className="text-[13px] font-bold text-text">
              {walletLoading ? '...' : displayAmount(totalBalance)}
            </p>
          </div>
          <div className="rounded-[14px] bg-bg-subtle px-3 py-2">
            <p className="text-[10px] font-semibold text-muted">{t('dashboard.credit_card_liability')}</p>
            <p className="text-[13px] font-bold text-text">
              {walletLoading ? '...' : displayAmount(totalCreditCardLiability, '-')}
            </p>
          </div>
          <div className="rounded-[14px] bg-bg-subtle px-3 py-2">
            <p className="text-[10px] font-semibold text-muted">{t('dashboard.income_this_month')}</p>
            <p className="text-[13px] font-bold text-text">
              {summaryLoading ? '...' : displayAmount(totalIncome, '+')}
            </p>
          </div>
          <div className="rounded-[14px] bg-bg-subtle px-3 py-2">
            <p className="text-[10px] font-semibold text-muted">{t('dashboard.expense_this_month')}</p>
            <p className="text-[13px] font-bold text-text">
              {summaryLoading ? '...' : displayAmount(totalExpense, '-')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Cash-flow forecast ───────────────────────────────────────────── */}
      <div className={`mx-4 mt-4 rounded-[18px] border border-border bg-surface p-4 text-text shadow-sm ring-1 ${forecastStyle.ring}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ForecastIcon size={18} className={`${forecastStyle.accent} shrink-0`} />
            <h3 className="truncate text-[15px] font-bold text-text">{t('dashboard.forecast_title')}</h3>
          </div>
          {!forecastLoading && forecast && forecast.hasCurrentData && (
            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${forecastStyle.pill}`}>
              {forecastStyle.label}
            </span>
          )}
        </div>

        {forecastLoading || walletLoading ? (
          <div className="space-y-3">
            <div className="h-7 w-44 animate-pulse rounded-lg bg-surface-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
          </div>
        ) : forecast && forecast.hasCurrentData ? (
          <>
            <p className="text-[12px] font-semibold text-muted">{t('dashboard.forecast_projected_balance')}</p>
            <p className="mt-1 break-words text-[26px] font-bold leading-tight text-text tabular-nums">
              {displayAmount(forecast.projectedMonthEndBalance)}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[12px] bg-bg-subtle px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-muted">{t('dashboard.forecast_daily_average_expense')}</p>
                <p className="mt-1 text-[13px] font-bold text-text tabular-nums">
                  {displayAmount(forecast.dailyAverageExpense)}
                </p>
              </div>
              <div className="rounded-[12px] bg-bg-subtle px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-muted">{t('dashboard.forecast_projected_expense')}</p>
                <p className="mt-1 text-[13px] font-bold text-text tabular-nums">
                  {displayAmount(forecast.projectedMonthlyExpense)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-muted">
              {t('dashboard.forecast_elapsed_days')
                .replace('{elapsedDays}', String(forecast.elapsedDays))
                .replace('{daysInMonth}', String(forecast.daysInMonth))}
            </p>
          </>
        ) : (
          <div className="rounded-[14px] bg-bg-subtle px-4 py-5 text-center">
            <p className="text-[14px] font-semibold text-text">{t('dashboard.forecast_empty_title')}</p>
            <p className="mt-1 text-[12px] leading-5 text-muted">
              {t('dashboard.forecast_empty_hint')}
            </p>
          </div>
        )}
      </div>

      {hasBills && (
        <div
          className="mx-4 mt-4 flex cursor-pointer items-center gap-3 rounded-[16px] border border-border bg-surface px-4 py-3 shadow-sm ring-1 ring-amber-500/15 transition-transform active:scale-[0.98]"
          onClick={() => navigate(ROUTES.RECURRING_BILLS)}
        >
          <Bell size={18} className="shrink-0 text-[color:var(--warning)]" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-text">
              {reminders.length} {t('dashboard.bills_due_soon')}
            </p>
            <p className="text-[11px] text-muted">
              {overdueBillCount > 0
                ? `${overdueBillCount} ${t('dashboard.overdue_count')}`
                : t('dashboard.tap_to_view_details')}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </div>
      )}

      {/* ── Credit card alert banner ────────────────────────────────────── */}
      {primaryCreditCardAlert && (
        <div
          className={`mx-4 mt-4 flex cursor-pointer items-center gap-3 rounded-[16px] border border-border bg-surface px-4 py-3 shadow-sm ring-1 transition-transform active:scale-[0.98] ${creditCardAlertStyle.ring}`}
          onClick={() => navigate(ROUTES.WALLETS)}
        >
          <Bell size={18} className={`${creditCardAlertStyle.accent} shrink-0`} />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-text">
              {creditCardAlerts.length} {t('dashboard.credit_card_alerts')}
            </p>
            <p className="text-[11px] text-muted">
              {overdueCreditCardCount > 0
                ? `${overdueCreditCardCount} ${t('dashboard.credit_card_overdue_count')}`
                : primaryCreditCardAlert.type === 'due_soon'
                  ? t('dashboard.credit_card_due_soon')
                  : t('dashboard.credit_card_over_limit')}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </div>
      )}

      {/* ── Budget Mini-cards ────────────────────────────────────────────── */}
      {!budgetLoading && topBudgets.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <h3 className="text-[15px] font-bold text-text">{t('navigation.budgets')}</h3>
            <button
              onClick={() => navigate(ROUTES.BUDGETS)}
              className="flex items-center gap-0.5 text-[12px] font-semibold text-[color:var(--primary-hover)]"
            >
              {t('common.see_all')} <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4">
            {topBudgets.map(p => (
              <div
                key={p.budget.category_id}
                onClick={() => openBudgetTransactions(p)}
                className="cursor-pointer rounded-[18px] border border-border bg-surface p-4 shadow-sm transition-transform active:scale-95"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-muted text-[22px]">
                    <CategoryIcon
                      icon={p.budget.icon}
                      name={p.budget.category_name}
                      type={p.budget.category_type}
                      size={22}
                      className={`${BUDGET_STATUS_STYLE[p.status].accent} leading-none`}
                    />
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold text-text ${BUDGET_STATUS_STYLE[p.status].pill}`}
                  >
                    {Math.round(p.percentage * 100)}%
                  </span>
                </div>
                <p className="mb-2 truncate text-[12px] font-semibold leading-tight text-text">
                  {p.budget.category_name}
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full w-full origin-left rounded-full transition-transform duration-300 ${BUDGET_STATUS_STYLE[p.status].fill}`}
                    style={{ transform: `scaleX(${Math.min(Math.max(p.percentage, 0), 1)})` }}
                  />
                </div>
                <p className="mt-1.5 truncate text-[10px] text-muted">
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
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-primary">
            <WalletCards size={28} />
          </div>
          <h3 className="text-[18px] font-bold text-text">{t('dashboard.empty_wallet_title')}</h3>
          <p className="text-[13px] leading-relaxed text-text">
            {t('dashboard.empty_wallet_hint')}
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.WALLETS_NEW)}
            className="h-11 rounded-[12px] bg-[color:var(--primary-hover)] px-5 text-[14px] font-semibold text-surface shadow-sm transition-transform active:scale-95"
          >
            {t('dashboard.create_wallet')}
          </button>
        </div>
      )}
    </div>
  );
}

export { DashboardPage };
