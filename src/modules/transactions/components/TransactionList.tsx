import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { PlusCircle, SearchX } from 'lucide-react';
import { Transaction } from '../domain/transaction.model';
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

interface SummaryRow {
  key: string;
  label: string;
  count: number;
  income: number;
  expense: number;
}

interface DaySummaryRow extends SummaryRow {
  startDate: number;
  endDate: number;
}

interface WeekSummaryRow extends SummaryRow {
  dayRows: DaySummaryRow[];
}

interface QuarterSummaryRow extends SummaryRow {
  monthRows: YearMonthSummaryRow[];
}

interface YearMonthSummaryRow extends SummaryRow {
  startDate: number;
  endDate: number;
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
  const displayAmount = (amount: number) => showAmounts ? formatAmount(amount, locale) : HIDDEN_AMOUNT;
  const [expandedQuarterKey, setExpandedQuarterKey] = useState<string | null>(() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `${now.getFullYear()}-Q${quarter}`;
  });
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(() =>
    toDateKey(startOfLocalWeek(new Date())),
  );

  useEffect(() => {
    setExpandedWeekKey(toDateKey(getStartOfWeek(new Date(), displayFormatSettings)));
  }, [displayFormatSettings]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded-[10px] bg-gray-100" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    const EmptyIcon = emptyVariant === 'filtered' ? SearchX : PlusCircle;

    return (
      <div className="flex flex-col items-center px-5 py-10 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
          <EmptyIcon size={27} />
        </div>
        <h3 className="text-[17px] font-bold text-gray-900">
          {emptyMessage ?? t('transactions.empty')}
        </h3>
        {emptyDescription && (
          <p className="mt-2 max-w-[300px] text-[13px] leading-5 text-gray-500">
            {emptyDescription}
          </p>
        )}
        {emptyAction && <div className="mt-5">{emptyAction}</div>}
      </div>
    );
  }

  const sortedTransactions = [...transactions].sort(
    (a, b) => b.transaction_date - a.transaction_date,
  );

  const groups: { label: string; items: Transaction[]; income: number; expense: number }[] = [];
  let currentGroup: {
    label: string;
    items: Transaction[];
    income: number;
    expense: number;
  } | null = null;

  sortedTransactions.forEach((tx) => {
    const date = new Date(tx.transaction_date);
    let label = '';

    if (viewType === 'day') {
      label = formatAppDate(tx.transaction_date, displayFormatSettings);
    } else if (viewType === 'month') {
      label = formatAppMonth(tx.transaction_date, displayFormatSettings, locale);
    } else if (viewType === 'year') {
      label = String(date.getFullYear());
    }

    // Capitalize first character
    label = label.charAt(0).toUpperCase() + label.slice(1);

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, items: [], income: 0, expense: 0 };
      groups.push(currentGroup);
    }

    currentGroup.items.push(tx);
    if (tx.exclude_from_total || tx.is_budget_offset) return;
    if (tx.type === 'income') currentGroup.income += tx.amount;
    else if (tx.type === 'expense') currentGroup.expense += tx.amount;
  });

  function addTransactionAmount(row: SummaryRow, tx: Transaction) {
    row.count += 1;
    if (tx.exclude_from_total || tx.is_budget_offset) return;
    if (tx.type === 'income') row.income += tx.amount;
    else if (tx.type === 'expense') row.expense += tx.amount;
  }

  function formatShortDate(date: Date) {
    return formatAppDate(date.getTime(), displayFormatSettings);
  }

  function startOfLocalWeek(date: Date) {
    return getStartOfWeek(date, displayFormatSettings);
  }

  function buildDailySummaryRows(items: Transaction[]): DaySummaryRow[] {
    const rows: DaySummaryRow[] = [];
    let currentRow: DaySummaryRow | null = null;

    items.forEach((tx) => {
      const date = new Date(tx.transaction_date);
      const key = toDateKey(date);
      const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
      const label = `${weekday} ${formatAppDate(tx.transaction_date, displayFormatSettings)}`;

      if (!currentRow || currentRow.key !== key) {
        currentRow = {
          key,
          label,
          count: 0,
          income: 0,
          expense: 0,
          startDate: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0,
            0,
            0,
            0,
          ).getTime(),
          endDate: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            23,
            59,
            59,
            999,
          ).getTime(),
        };
        rows.push(currentRow);
      }

      addTransactionAmount(currentRow, tx);
    });

    return rows;
  }

  function buildWeeklySummaryRows(items: Transaction[]): WeekSummaryRow[] {
    type DraftWeekSummaryRow = WeekSummaryRow & { items: Transaction[] };

    const rows: DraftWeekSummaryRow[] = [];
    let currentRow: DraftWeekSummaryRow | null = null;

    items.forEach((tx) => {
      const date = new Date(tx.transaction_date);
      const weekStart = startOfLocalWeek(date);
      const weekEnd = getEndOfWeek(date, displayFormatSettings);
      const key = toDateKey(weekStart);
      const label = `${t('transactions.label_week')} ${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;

      if (!currentRow || currentRow.key !== key) {
        currentRow = {
          key,
          label,
          count: 0,
          income: 0,
          expense: 0,
          dayRows: [],
          items: [],
        };
        rows.push(currentRow);
      }

      currentRow.items.push(tx);
      addTransactionAmount(currentRow, tx);
    });

    return rows.map(({ items: weekItems, ...row }) => ({
      ...row,
      dayRows: buildDailySummaryRows(weekItems),
    }));
  }

  function buildQuarterSummaryRows(items: Transaction[]): QuarterSummaryRow[] {
    const rows: QuarterSummaryRow[] = [];
    let currentQuarterRow: QuarterSummaryRow | null = null;
    let currentMonthRow: YearMonthSummaryRow | null = null;

    items.forEach((tx) => {
      const date = new Date(tx.transaction_date);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const quarter = Math.floor(monthIndex / 3) + 1;
      const quarterKey = `${year}-Q${quarter}`;

      if (!currentQuarterRow || currentQuarterRow.key !== quarterKey) {
        currentQuarterRow = {
          key: quarterKey,
          label: `${t('transactions.label_quarter')} ${quarter}`,
          count: 0,
          income: 0,
          expense: 0,
          monthRows: [],
        };
        rows.push(currentQuarterRow);
        currentMonthRow = null;
      }

      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      if (!currentMonthRow || currentMonthRow.key !== monthKey) {
        const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
        const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
        const label = formatAppMonth(monthStart.getTime(), displayFormatSettings, locale);

        currentMonthRow = {
          key: monthKey,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          count: 0,
          income: 0,
          expense: 0,
          startDate: monthStart.getTime(),
          endDate: monthEnd.getTime(),
        };
        currentQuarterRow.monthRows.push(currentMonthRow);
      }

      addTransactionAmount(currentQuarterRow, tx);
      addTransactionAmount(currentMonthRow, tx);
    });

    return rows;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {groups.map((group) => (
        <div key={group.label}>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 'bold',
              color: 'var(--text)',
              marginBottom: '10px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{group.label}</span>
              <span
                style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}
              >
                {group.items.length}{' '}
                {group.items.length === 1
                  ? t('transactions.records_one')
                  : t('transactions.records_many')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', fontWeight: '500' }}>
              <div style={{ color: '#059669' }}>
                {t('transactions.label_income')}: {displayAmount(group.income)}
              </div>
              <div style={{ color: '#e11d48' }}>
                {t('transactions.label_expense')}: {displayAmount(group.expense)}
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                {t('transactions.label_balance')}:{' '}
                {displayAmount(group.income - group.expense)}
              </div>
            </div>
          </div>

          {viewType === 'month' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {buildWeeklySummaryRows(group.items).map((weekRow) => {
                const isWeekExpanded = expandedWeekKey === weekRow.key;

                return (
                  <div
                    key={weekRow.key}
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 2px var(--shadow-color)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedWeekKey((current) =>
                          current === weekRow.key ? null : weekRow.key,
                        )
                      }
                      aria-expanded={isWeekExpanded}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--surface)',
                        border: 'none',
                        minHeight: '66px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                          {weekRow.label}
                        </div>
                        <div
                          style={{
                            marginTop: '3px',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {weekRow.count}{' '}
                          {weekRow.count === 1
                            ? t('transactions.records_one')
                            : t('transactions.records_many')}
                        </div>
                      </div>

                      <div
                        style={{ display: 'grid', gap: '4px', textAlign: 'right', flexShrink: 0 }}
                      >
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#059669',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t('transactions.label_income')}: {displayAmount(weekRow.income)}
                        </div>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#e11d48',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t('transactions.label_expense')}: {displayAmount(weekRow.expense)}
                        </div>
                      </div>
                    </button>

                    {isWeekExpanded && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          background: 'var(--bg-subtle)',
                          borderTop: '1px solid var(--border)',
                          padding: '8px',
                        }}
                      >
                        {weekRow.dayRows.map((dayRow) => (
                          <button
                            key={`${weekRow.key}-${dayRow.key}`}
                            type="button"
                            onClick={() =>
                              onSelectSummaryRange?.({
                                startDate: dayRow.startDate,
                                endDate: dayRow.endDate,
                                title: dayRow.label,
                              })
                            }
                            style={{
                              padding: '9px 12px',
                              background: 'var(--surface-muted)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '10px',
                              textAlign: 'left',
                              cursor: onSelectSummaryRange ? 'pointer' : 'default',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  color: 'var(--text)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {dayRow.label}
                              </div>
                              <div
                                style={{
                                  marginTop: '2px',
                                  fontSize: '0.7rem',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {dayRow.count}{' '}
                                {dayRow.count === 1
                                  ? t('transactions.records_one')
                                  : t('transactions.records_many')}
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gap: '2px',
                                textAlign: 'right',
                                flexShrink: 0,
                                fontSize: '0.76rem',
                                fontWeight: 700,
                              }}
                            >
                              <div style={{ color: '#059669', whiteSpace: 'nowrap' }}>
                                {displayAmount(dayRow.income)}
                              </div>
                              <div style={{ color: '#e11d48', whiteSpace: 'nowrap' }}>
                                {displayAmount(dayRow.expense)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : viewType === 'year' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {buildQuarterSummaryRows(group.items).map((quarterRow) => {
                const isQuarterExpanded = expandedQuarterKey === quarterRow.key;

                return (
                  <div
                    key={quarterRow.key}
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 2px var(--shadow-color)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedQuarterKey((current) =>
                          current === quarterRow.key ? null : quarterRow.key,
                        )
                      }
                      aria-expanded={isQuarterExpanded}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--surface)',
                        border: 'none',
                        minHeight: '66px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                          {quarterRow.label}
                        </div>
                        <div
                          style={{
                            marginTop: '3px',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {quarterRow.count}{' '}
                          {quarterRow.count === 1
                            ? t('transactions.records_one')
                            : t('transactions.records_many')}
                        </div>
                      </div>

                      <div
                        style={{ display: 'grid', gap: '4px', textAlign: 'right', flexShrink: 0 }}
                      >
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#059669',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t('transactions.label_income')}: {displayAmount(quarterRow.income)}
                        </div>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: '#e11d48',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t('transactions.label_expense')}:{' '}
                          {displayAmount(quarterRow.expense)}
                        </div>
                      </div>
                    </button>

                    {isQuarterExpanded && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          background: 'var(--bg-subtle)',
                          borderTop: '1px solid var(--border)',
                          padding: '8px',
                        }}
                      >
                        {quarterRow.monthRows.map((monthRow) => (
                          <button
                            key={`${quarterRow.key}-${monthRow.key}`}
                            type="button"
                            onClick={() =>
                              onSelectSummaryRange?.({
                                startDate: monthRow.startDate,
                                endDate: monthRow.endDate,
                                title: `${monthRow.label} ${group.label}`,
                              })
                            }
                            style={{
                              padding: '9px 12px',
                              background: 'var(--surface-muted)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '10px',
                              textAlign: 'left',
                              cursor: onSelectSummaryRange ? 'pointer' : 'default',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  color: 'var(--text)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {monthRow.label}
                              </div>
                              <div
                                style={{
                                  marginTop: '2px',
                                  fontSize: '0.7rem',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {monthRow.count}{' '}
                                {monthRow.count === 1
                                  ? t('transactions.records_one')
                                  : t('transactions.records_many')}
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gap: '2px',
                                textAlign: 'right',
                                flexShrink: 0,
                                fontSize: '0.76rem',
                                fontWeight: 700,
                              }}
                            >
                              <div style={{ color: '#059669', whiteSpace: 'nowrap' }}>
                                {displayAmount(monthRow.income)}
                              </div>
                              <div style={{ color: '#e11d48', whiteSpace: 'nowrap' }}>
                                {displayAmount(monthRow.expense)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {group.items.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onSelect={onSelect}
                  showDate={viewType !== 'day'}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
