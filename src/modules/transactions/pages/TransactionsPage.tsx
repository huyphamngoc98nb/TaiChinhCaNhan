import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { BackButton } from '@/shared/components/BackButton';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionList } from '../components/TransactionList';
import './TransactionsPage.css';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useWallets } from '@/modules/wallets/hooks/useWallets';
import { useCategories } from '@/modules/categories/hooks/useCategories';
import { AdvancedTransactionFilterSheet } from '../components/AdvancedTransactionFilterSheet';
import type { TransactionFilter } from '../domain/transaction.model';
import { getAppLocale } from '@/shared/utils/locale';
import { ROUTES } from '@/shared/constants/routes';
import { addMonths, getMonthDateRange, isCurrentMonth, toMonthKey } from '@/shared/utils/date-range';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import { formatAppDate, formatAppMonth } from '@/shared/utils/display-format';

export type ViewType = 'day' | 'month' | 'year';

interface TransactionNavigationState {
  filter?: TransactionFilter;
  title?: string;
}

const ADVANCED_FILTER_SHEET_ID = 'advanced-transaction-filter';

export function TransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as TransactionNavigationState | null;
  const initialFilter = useMemo(
    () => navigationState?.filter ?? getMonthDateRange(toMonthKey()),
    [navigationState?.filter],
  );
  const [selectedMonth, setSelectedMonth] = useState(() => (
    initialFilter.startDate ? toMonthKey(new Date(initialFilter.startDate)) : toMonthKey()
  ));
  const [hasCustomDateRange, setHasCustomDateRange] = useState(Boolean(navigationState?.filter));
  const { transactions, loading, filter, setFilter } = useTransactions(initialFilter);
  const { t, language } = useLanguage();
  const { wallets } = useWallets();
  const { categories } = useCategories();
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('day');
  const displayFormatSettings = useDisplayFormatSettings();
  const [drilldownSnapshot, setDrilldownSnapshot] = useState<{
    filter: TransactionFilter;
    viewType: ViewType;
    hasCustomDateRange: boolean;
    title?: string;
  } | null>(null);
  const isDayDetail = Boolean(drilldownSnapshot);
  const locale = getAppLocale(language);
  const selectedMonthRange = useMemo(() => getMonthDateRange(selectedMonth), [selectedMonth]);
  const selectedMonthLabel = useMemo(
    () => formatAppMonth(selectedMonthRange.startDate, displayFormatSettings, locale),
    [displayFormatSettings, locale, selectedMonthRange.startDate],
  );
  const isNextMonthDisabled = isCurrentMonth(selectedMonth);

  const handleEdit = (id: string) => navigate(`/transactions/${id}/edit`);
  const handleBack = () => {
    if (drilldownSnapshot) {
      setFilter(drilldownSnapshot.filter);
      setViewType(drilldownSnapshot.viewType);
      setHasCustomDateRange(drilldownSnapshot.hasCustomDateRange);
      setDrilldownSnapshot(null);
      return;
    }

    navigate(ROUTES.HOME);
  };

  const applyMonth = (monthKey: string) => {
    const range = getMonthDateRange(monthKey);
    setSelectedMonth(monthKey);
    setHasCustomDateRange(false);
    setDrilldownSnapshot(null);
    setFilter((current) => ({
      ...current,
      startDate: range.startDate,
      endDate: range.endDate,
    }));
  };

  const handlePreviousMonth = () => {
    applyMonth(addMonths(selectedMonth, -1));
  };

  const handleNextMonth = () => {
    if (!isNextMonthDisabled) {
      applyMonth(addMonths(selectedMonth, 1));
    }
  };

  const handleAdvancedFilterApply = (nextFilter: TransactionFilter) => {
    setHasCustomDateRange(
      nextFilter.startDate !== selectedMonthRange.startDate ||
      nextFilter.endDate !== selectedMonthRange.endDate,
    );
    setFilter({ ...nextFilter });
  };

  const getResetFilterDraft = (): TransactionFilter => ({
    startDate: selectedMonthRange.startDate,
    endDate: selectedMonthRange.endDate,
  });

  const handleResetFilters = () => {
    setHasCustomDateRange(false);
    setFilter(getResetFilterDraft());
  };

  const handleSelectSummaryRange = (range: {
    startDate: number;
    endDate: number;
    title?: string;
  }) => {
    setDrilldownSnapshot({
      filter,
      viewType,
      hasCustomDateRange,
      title: range.title,
    });
    setShowAdvancedFilter(false);
    setHasCustomDateRange(true);
    setFilter({
      ...filter,
      startDate: range.startDate,
      endDate: range.endDate,
    });
    setViewType('day');
  };

  const viewLabels: Record<ViewType, string> = {
    day: t('transactions.view_day'),
    month: t('transactions.view_month'),
    year: t('transactions.view_year'),
  };

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];

    if (hasCustomDateRange) {
      labels.push(t('transactions.custom_date_range'));
    }
    if (filter.wallet_id) {
      labels.push(
        wallets.find((wallet) => wallet.id === filter.wallet_id)?.name ??
        t('transactions.wallet'),
      );
    }
    if (filter.type === 'expense') {
      labels.push(t('transactions.filter_expenses'));
    } else if (filter.type === 'income') {
      labels.push(t('transactions.filter_income'));
    }
    if (filter.category_id) {
      labels.push(
        categories.find((category) => category.id === filter.category_id)?.name ??
        t('transactions.category'),
      );
    }
    if (filter.note?.trim()) {
      labels.push(`“${filter.note.trim()}”`);
    }

    return labels;
  }, [categories, filter.category_id, filter.note, filter.type, filter.wallet_id, hasCustomDateRange, t, wallets]);
  const activeFilterCount = activeFilterLabels.length;
  const hasAdvancedFilter = activeFilterCount > 0;
  const customPeriodLabel = hasCustomDateRange && filter.startDate && filter.endDate
    ? `${formatAppDate(filter.startDate, displayFormatSettings)} – ${formatAppDate(filter.endDate, displayFormatSettings)}`
    : null;
  const title =
    navigationState?.title ??
    drilldownSnapshot?.title ??
    (isDayDetail && filter.startDate
      ? formatAppDate(filter.startDate, displayFormatSettings)
      : t('transactions.history_title'));

  return (
    <main className="transactions-page" aria-busy={loading}>
      <header className="transactions-history-header">
        <div className="transactions-history-header__top">
          <BackButton onClick={handleBack} ariaLabel={t('common.back')} />
          <h1 className="transactions-history-header__title">{title}</h1>

          {!isDayDetail && (
            <button
              className="transactions-filter-button"
              type="button"
              onClick={() => setShowAdvancedFilter(true)}
              aria-label={
                hasAdvancedFilter
                  ? `${t('transactions.advanced_filter')} (${activeFilterCount})`
                  : t('transactions.advanced_filter')
              }
              aria-expanded={showAdvancedFilter}
              aria-controls={ADVANCED_FILTER_SHEET_ID}
              data-active={hasAdvancedFilter}
            >
              <SlidersHorizontal size={18} aria-hidden="true" />
              <span>{t('transactions.filter_button')}</span>
              {hasAdvancedFilter && <span aria-hidden="true">· {activeFilterCount}</span>}
            </button>
          )}
        </div>
      </header>

      {!isDayDetail && (
        <section className="transactions-history-controls">
          <div
            className="transactions-history-controls__row"
            data-custom-period={Boolean(customPeriodLabel)}
          >
            <nav
              className="transactions-period"
              aria-label={t('transactions.period_navigation')}
              data-custom-period={Boolean(customPeriodLabel)}
            >
              <button
                className="transactions-period__button"
                type="button"
                onClick={handlePreviousMonth}
                aria-label={t('transactions.previous_month')}
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>

              <div className="transactions-period__label" aria-live="polite">
                <span className="transactions-period__value">
                  {customPeriodLabel ?? selectedMonthLabel}
                </span>
                {customPeriodLabel && (
                  <span className="transactions-period__hint">
                    {t('transactions.custom_date_range')}
                  </span>
                )}
              </div>

              <button
                className="transactions-period__button"
                type="button"
                onClick={handleNextMonth}
                disabled={isNextMonthDisabled}
                aria-label={t('transactions.next_month')}
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </nav>

            <div className="transactions-view-switcher" aria-label={t('transactions.view_selector')}>
              {(['day', 'month', 'year'] as ViewType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className="transactions-view-switcher__button"
                  onClick={() => setViewType(type)}
                  aria-pressed={viewType === type}
                >
                  {viewLabels[type]}
                </button>
              ))}
            </div>
          </div>

          {hasAdvancedFilter && (
            <div className="transactions-active-filters" role="status">
              <div className="transactions-active-filters__summary">
                {t('transactions.active_filters')}: {activeFilterLabels.join(' · ')}
              </div>
              <button
                type="button"
                className="transactions-active-filters__clear"
                onClick={handleResetFilters}
              >
                {t('transactions.clear_filters')}
              </button>
            </div>
          )}
        </section>
      )}

      <AdvancedTransactionFilterSheet
        id={ADVANCED_FILTER_SHEET_ID}
        isOpen={showAdvancedFilter}
        filter={filter}
        wallets={wallets}
        categories={categories}
        onApply={handleAdvancedFilterApply}
        onResetDraft={getResetFilterDraft}
        onClose={() => setShowAdvancedFilter(false)}
      />

      <section
        className="transactions-history-content"
        aria-label={t('transactions.history_content')}
      >
        <TransactionList
          transactions={transactions}
          loading={loading}
          onSelect={handleEdit}
          onSelectSummaryRange={handleSelectSummaryRange}
          viewType={viewType}
          emptyVariant={hasAdvancedFilter ? 'filtered' : 'default'}
          emptyMessage={
            hasAdvancedFilter
              ? t('transactions.empty_filtered')
              : t('transactions.empty_period')
          }
          emptyDescription={
            hasAdvancedFilter
              ? t('transactions.empty_filtered_hint')
              : t('transactions.empty_default_hint')
          }
          emptyAction={
            hasAdvancedFilter ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="transactions-empty-state__action"
              >
                {t('transactions.clear_filters')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(ROUTES.TRANSACTIONS_NEW)}
                className="transactions-empty-state__action"
              >
                {t('transactions.add_title')}
              </button>
            )
          }
        />
      </section>
    </main>
  );
}
