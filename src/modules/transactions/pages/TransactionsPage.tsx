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
  const selectedMonthLabel = useMemo(() => {
    return formatAppMonth(selectedMonthRange.startDate, displayFormatSettings, locale);
  }, [displayFormatSettings, locale, selectedMonthRange.startDate]);
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

  const handleAdvancedFilterChange = (nextFilter: TransactionFilter) => {
    const dateChanged =
      nextFilter.startDate !== filter.startDate || nextFilter.endDate !== filter.endDate;

    if (dateChanged) {
      setHasCustomDateRange(
        nextFilter.startDate !== selectedMonthRange.startDate ||
          nextFilter.endDate !== selectedMonthRange.endDate,
      );
    }

    setFilter(nextFilter);
  };

  const handleResetFilters = () => {
    setHasCustomDateRange(false);
    setFilter({
      startDate: selectedMonthRange.startDate,
      endDate: selectedMonthRange.endDate,
    });
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

  const hasAdvancedFilter = Boolean(
    hasCustomDateRange || filter.wallet_id || filter.type || filter.category_id || filter.note,
  );
  const title =
    navigationState?.title ??
    drilldownSnapshot?.title ??
    (isDayDetail && filter.startDate
      ? formatAppDate(filter.startDate, displayFormatSettings)
      : t('transactions.history_title'));

  return (
    <div style={{ minHeight: '100%', paddingBottom: '80px' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          padding: '16px 16px 12px',
          background: 'var(--bg)',
          boxShadow: '0 1px 0 rgba(15, 23, 42, 0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <BackButton onClick={handleBack} ariaLabel={t('common.back')} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', minWidth: 0 }}>{title}</h2>
          </div>

          <div
            className="transactions-history-toolbar"
            style={{
              display: isDayDetail ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              flexWrap: 'wrap',
              marginLeft: 'auto',
            }}
          >
            <div
              className="transactions-month-navigator"
              aria-label={t('transactions.current_month')}
              style={{
                minHeight: '38px',
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--surface)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                overflow: 'visible',
                flex: '0 1 auto',
                maxWidth: '100%',
              }}
            >
              <button
                className="transactions-month-button"
                type="button"
                onClick={handlePreviousMonth}
                aria-label={t('transactions.previous_month')}
                style={{
                  width: '38px',
                  minHeight: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderRight: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text)',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span
                className="transactions-month-label"
                style={{
                  minWidth: '68px',
                  padding: '0 8px',
                  color: 'var(--text)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedMonthLabel}
              </span>
              <button
                className="transactions-month-button"
                type="button"
                onClick={handleNextMonth}
                disabled={isNextMonthDisabled}
                aria-label={t('transactions.next_month')}
                style={{
                  width: '38px',
                  minHeight: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  borderLeft: '1px solid var(--border)',
                  background: 'transparent',
                  color: isNextMonthDisabled ? 'var(--text-muted)' : 'var(--text)',
                  opacity: isNextMonthDisabled ? 0.45 : 1,
                  cursor: isNextMonthDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              className="transactions-advanced-filter-button"
              type="button"
              onClick={() => setShowAdvancedFilter((open) => !open)}
              aria-label={t('transactions.advanced_filter')}
              aria-expanded={showAdvancedFilter}
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: hasAdvancedFilter ? 'var(--primary)' : 'var(--surface)',
                color: hasAdvancedFilter ? 'white' : 'var(--text)',
                border: hasAdvancedFilter ? 'none' : '1px solid var(--border)',
                borderRadius: '10px',
                boxShadow: hasAdvancedFilter
                  ? '0 4px 6px -1px rgba(14, 165, 233, 0.2)'
                  : '0 1px 2px rgba(0,0,0,0.04)',
                flexShrink: 0,
              }}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        <div
          style={{
            display: isDayDetail ? 'none' : 'flex',
            background: 'var(--border)',
            padding: '2px',
            borderRadius: '10px',
          }}
        >
          {(['day', 'month', 'year'] as ViewType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setViewType(type)}
              style={{
                flex: 1,
                minHeight: '38px',
                padding: '8px',
                border: 'none',
                borderRadius: '8px',
                background: viewType === type ? 'var(--surface)' : 'transparent',
                color: viewType === type ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.85rem',
                fontWeight: viewType === type ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {viewLabels[type]}
            </button>
          ))}
        </div>
      </div>

      <AdvancedTransactionFilterSheet
        isOpen={showAdvancedFilter}
        filter={filter}
        wallets={wallets}
        categories={categories}
        onChange={handleAdvancedFilterChange}
        onReset={handleResetFilters}
        onClose={() => setShowAdvancedFilter(false)}
      />

      <div style={{ padding: '18px 16px 0' }}>
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
              : t('transactions.empty')
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
                className="h-11 rounded-[12px] bg-indigo-500 px-5 text-[14px] font-semibold text-white shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                {t('transactions.reset_filters')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(ROUTES.TRANSACTIONS_NEW)}
                className="h-11 rounded-[12px] bg-indigo-500 px-5 text-[14px] font-semibold text-white shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                {t('transactions.add_title')}
              </button>
            )
          }
        />
      </div>
    </div>
  );
}
