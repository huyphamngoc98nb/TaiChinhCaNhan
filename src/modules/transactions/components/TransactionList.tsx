import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight, PlusCircle, SearchX } from 'lucide-react';
import type { Transaction } from '../domain/transaction.model';
import { TransactionItem } from './TransactionItem';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { getAppLocale } from '@/shared/utils/locale';
import { HIDDEN_AMOUNT, useAmountVisibility } from '@/shared/hooks/useAmountVisibility';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import {
  formatAppDate,
  formatAppMonth,
  getEndOfWeek,
  getStartOfWeek,
} from '@/shared/utils/display-format';
import { toDateKey } from '@/shared/utils/date-range';
import {
  buildQuarterSummaryRows,
  buildWeeklySummaryRows,
  groupTransactions,
  type TransactionSummary,
} from './transaction-list-grouping';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  onSelect: (id: string) => void;
  onSelectSummaryRange?: (range: { startDate: number; endDate: number; title?: string }) => void;
  viewType?: 'day' | 'month' | 'year';
  emptyMessage?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  emptyVariant?: 'default' | 'filtered';
}

interface SummaryMetricsProps {
  summary: TransactionSummary;
  displayAmount: (amount: number) => string;
  t: ReturnType<typeof useLanguage>['t'];
}

function SummaryMetrics({ summary, displayAmount, t }: SummaryMetricsProps) {
  return (
    <div className="transaction-summary-metrics">
      <span className="transaction-summary-metrics__item transaction-summary-metrics__item--income">
        {t('transactions.label_income')} {displayAmount(summary.income)}
      </span>
      <span className="transaction-summary-metrics__item transaction-summary-metrics__item--expense">
        {t('transactions.label_expense')} {displayAmount(summary.expense)}
      </span>
      <span className="transaction-summary-metrics__item transaction-summary-metrics__item--balance">
        {t('transactions.label_balance')} {displayAmount(summary.balance)}
      </span>
    </div>
  );
}

function capitalizeLabel(label: string) {
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

export function TransactionList({
  transactions,
  loading,
  onSelect,
  onSelectSummaryRange,
  viewType = 'day',
  emptyMessage,
  emptyDescription,
  emptyAction,
  emptyVariant = 'default',
}: Props) {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const { showAmounts } = useAmountVisibility();
  const displayFormatSettings = useDisplayFormatSettings();
  const locale = getAppLocale(language);
  const displayAmount = (amount: number) => (
    showAmounts ? formatAmount(amount, locale) : HIDDEN_AMOUNT
  );
  const [expandedQuarterKey, setExpandedQuarterKey] = useState<string | null>(() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `${now.getFullYear()}-Q${quarter}`;
  });
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(() =>
    toDateKey(getStartOfWeek(new Date(), displayFormatSettings)),
  );

  useEffect(() => {
    setExpandedWeekKey(toDateKey(getStartOfWeek(new Date(), displayFormatSettings)));
  }, [displayFormatSettings]);

  const groups = useMemo(() => groupTransactions(
    transactions,
    (transaction) => {
      const date = new Date(transaction.transaction_date);

      if (viewType === 'day') return toDateKey(date);
      if (viewType === 'month') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      return String(date.getFullYear());
    },
    (transaction) => {
      const date = new Date(transaction.transaction_date);

      if (viewType === 'day') {
        return capitalizeLabel(formatAppDate(transaction.transaction_date, displayFormatSettings));
      }
      if (viewType === 'month') {
        return capitalizeLabel(
          formatAppMonth(transaction.transaction_date, displayFormatSettings, locale),
        );
      }
      return String(date.getFullYear());
    },
  ), [displayFormatSettings, locale, transactions, viewType]);

  const weeklyRowsByGroup = useMemo(() => {
    if (viewType !== 'month') return new Map<string, ReturnType<typeof buildWeeklySummaryRows>>();

    return new Map(groups.map((group) => [
      group.key,
      buildWeeklySummaryRows(
        group.items,
        (date) => getStartOfWeek(date, displayFormatSettings),
        (date) => getEndOfWeek(date, displayFormatSettings),
        (start, end) => (
          `${t('transactions.label_week')} ${formatAppDate(start.getTime(), displayFormatSettings)} – ${formatAppDate(end.getTime(), displayFormatSettings)}`
        ),
        (transaction) => {
          const date = new Date(transaction.transaction_date);
          const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
          return `${weekday} ${formatAppDate(transaction.transaction_date, displayFormatSettings)}`;
        },
      ),
    ]));
  }, [displayFormatSettings, groups, locale, t, viewType]);

  const quarterRowsByGroup = useMemo(() => {
    if (viewType !== 'year') return new Map<string, ReturnType<typeof buildQuarterSummaryRows>>();

    return new Map(groups.map((group) => [
      group.key,
      buildQuarterSummaryRows(
        group.items,
        (quarter) => `${t('transactions.label_quarter')} ${quarter}`,
        (timestamp) => capitalizeLabel(
          formatAppMonth(timestamp, displayFormatSettings, locale),
        ),
      ),
    ]));
  }, [displayFormatSettings, groups, locale, t, viewType]);

  if (loading) {
    return (
      <div
        className="transactions-loading"
        role="status"
        aria-label={t('transactions.loading_history')}
      >
        {[0, 1].map((group) => (
          <div className="transactions-loading__group" key={group} aria-hidden="true">
            <div className="transactions-loading__heading" />
            <div className="transactions-loading__rows">
              {[0, 1].map((row) => (
                <div className="transactions-loading__row" key={row}>
                  <div className="transactions-loading__row-copy">
                    <div className="transactions-loading__row-line" />
                    <div className="transactions-loading__row-line" />
                  </div>
                  <div className="transactions-loading__amount" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    const EmptyIcon = emptyVariant === 'filtered' ? SearchX : PlusCircle;

    return (
      <div className="transactions-empty-state">
        <div className="transactions-empty-state__icon" aria-hidden="true">
          <EmptyIcon size={24} />
        </div>
        <h2 className="transactions-empty-state__title">
          {emptyMessage ?? t('transactions.empty')}
        </h2>
        {emptyDescription && (
          <p className="transactions-empty-state__description">{emptyDescription}</p>
        )}
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="transactions-list">
      {groups.map((group) => (
        <section className="transaction-day-group" key={group.key}>
          <header className="transaction-group-header">
            <div className="transaction-group-header__top">
              <h2 className="transaction-group-header__title">{group.label}</h2>
              <span className="transaction-group-header__count">
                {group.count}{' '}
                {group.count === 1
                  ? t('transactions.records_one')
                  : t('transactions.records_many')}
              </span>
            </div>
            <SummaryMetrics summary={group} displayAmount={displayAmount} t={t} />
          </header>

          {viewType === 'day' && (
            <div className="transaction-day-group__items">
              {group.items.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}

          {viewType === 'month' && (
            <div className="transaction-summary-list">
              {(weeklyRowsByGroup.get(group.key) ?? []).map((weekRow) => {
                const isExpanded = expandedWeekKey === weekRow.key;

                return (
                  <div className="transaction-summary-group" key={weekRow.key}>
                    <button
                      type="button"
                      className="transaction-summary-group__toggle"
                      onClick={() => setExpandedWeekKey((current) => (
                        current === weekRow.key ? null : weekRow.key
                      ))}
                      aria-expanded={isExpanded}
                    >
                      <span className="transaction-summary-row__identity">
                        <span className="transaction-summary-row__label">{weekRow.label}</span>
                        <span className="transaction-summary-row__count">
                          {weekRow.count}{' '}
                          {weekRow.count === 1
                            ? t('transactions.records_one')
                            : t('transactions.records_many')}
                        </span>
                      </span>
                      <span className="transaction-summary-row__aside">
                        <span className="transaction-summary-row__metrics">
                          <span>{t('transactions.label_income')} {displayAmount(weekRow.income)}</span>
                          <span>{t('transactions.label_expense')} {displayAmount(weekRow.expense)}</span>
                          <span className="transaction-summary-row__balance">
                            {t('transactions.label_balance')} {displayAmount(weekRow.balance)}
                          </span>
                        </span>
                        <ChevronRight
                          size={20}
                          className="transaction-summary-row__chevron"
                          aria-hidden="true"
                        />
                      </span>
                    </button>

                    {isExpanded && weekRow.dayRows.map((dayRow) => (
                      <button
                        key={`${weekRow.key}-${dayRow.key}`}
                        type="button"
                        className="transaction-summary-row"
                        onClick={() => onSelectSummaryRange?.({
                          startDate: dayRow.startDate,
                          endDate: dayRow.endDate,
                          title: dayRow.label,
                        })}
                        aria-label={`${t('transactions.open_day_detail')}: ${dayRow.label}`}
                      >
                        <span className="transaction-summary-row__identity">
                          <span className="transaction-summary-row__label">{dayRow.label}</span>
                          <span className="transaction-summary-row__count">
                            {dayRow.count}{' '}
                            {dayRow.count === 1
                              ? t('transactions.records_one')
                              : t('transactions.records_many')}
                          </span>
                        </span>
                        <span className="transaction-summary-row__aside">
                          <span className="transaction-summary-row__metrics">
                            <span>{t('transactions.label_income')} {displayAmount(dayRow.income)}</span>
                            <span>{t('transactions.label_expense')} {displayAmount(dayRow.expense)}</span>
                            <span className="transaction-summary-row__balance">
                              {t('transactions.label_balance')} {displayAmount(dayRow.balance)}
                            </span>
                          </span>
                          <ChevronRight size={20} aria-hidden="true" />
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {viewType === 'year' && (
            <div className="transaction-summary-list">
              {(quarterRowsByGroup.get(group.key) ?? []).map((quarterRow) => {
                const isExpanded = expandedQuarterKey === quarterRow.key;

                return (
                  <div className="transaction-summary-group" key={quarterRow.key}>
                    <button
                      type="button"
                      className="transaction-summary-group__toggle"
                      onClick={() => setExpandedQuarterKey((current) => (
                        current === quarterRow.key ? null : quarterRow.key
                      ))}
                      aria-expanded={isExpanded}
                    >
                      <span className="transaction-summary-row__identity">
                        <span className="transaction-summary-row__label">{quarterRow.label}</span>
                        <span className="transaction-summary-row__count">
                          {quarterRow.count}{' '}
                          {quarterRow.count === 1
                            ? t('transactions.records_one')
                            : t('transactions.records_many')}
                        </span>
                      </span>
                      <span className="transaction-summary-row__aside">
                        <span className="transaction-summary-row__metrics">
                          <span>{t('transactions.label_income')} {displayAmount(quarterRow.income)}</span>
                          <span>{t('transactions.label_expense')} {displayAmount(quarterRow.expense)}</span>
                          <span className="transaction-summary-row__balance">
                            {t('transactions.label_balance')} {displayAmount(quarterRow.balance)}
                          </span>
                        </span>
                        <ChevronRight
                          size={20}
                          className="transaction-summary-row__chevron"
                          aria-hidden="true"
                        />
                      </span>
                    </button>

                    {isExpanded && quarterRow.monthRows.map((monthRow) => (
                      <button
                        key={`${quarterRow.key}-${monthRow.key}`}
                        type="button"
                        className="transaction-summary-row"
                        onClick={() => onSelectSummaryRange?.({
                          startDate: monthRow.startDate,
                          endDate: monthRow.endDate,
                          title: `${monthRow.label} ${group.label}`,
                        })}
                        aria-label={`${t('transactions.open_month_detail')}: ${monthRow.label}`}
                      >
                        <span className="transaction-summary-row__identity">
                          <span className="transaction-summary-row__label">{monthRow.label}</span>
                          <span className="transaction-summary-row__count">
                            {monthRow.count}{' '}
                            {monthRow.count === 1
                              ? t('transactions.records_one')
                              : t('transactions.records_many')}
                          </span>
                        </span>
                        <span className="transaction-summary-row__aside">
                          <span className="transaction-summary-row__metrics">
                            <span>{t('transactions.label_income')} {displayAmount(monthRow.income)}</span>
                            <span>{t('transactions.label_expense')} {displayAmount(monthRow.expense)}</span>
                            <span className="transaction-summary-row__balance">
                              {t('transactions.label_balance')} {displayAmount(monthRow.balance)}
                            </span>
                          </span>
                          <ChevronRight size={20} aria-hidden="true" />
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
