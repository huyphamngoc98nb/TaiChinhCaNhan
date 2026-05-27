import { useState } from 'react';
import { Transaction } from '../domain/transaction.model';
import { TransactionItem } from './TransactionItem';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { getAppLocale } from '@/shared/utils/locale';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  onSelect: (id: string) => void;
  onSelectSummaryRange?: (range: { startDate: number; endDate: number; title?: string }) => void;
  viewType?: 'day' | 'month' | 'year';
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

interface MonthSummaryRow extends SummaryRow {
  weekRows: WeekSummaryRow[];
}

interface WeekSummaryRow extends SummaryRow {
  startDate: number;
  endDate: number;
  items: Transaction[];
}

export function TransactionList({
  transactions,
  loading,
  onSelect,
  onSelectSummaryRange,
  viewType = 'day',
}: Props) {
  const { t, language } = useLanguage();
  const { formatAmount } = useCurrency();
  const locale = getAppLocale(language);
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
        {t('transactions.loading')}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
        {t('transactions.empty')}
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
      label = date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (viewType === 'month') {
      label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } else if (viewType === 'year') {
      label = date.toLocaleDateString(locale, { year: 'numeric' });
    }

    // Capitalize first character
    label = label.charAt(0).toUpperCase() + label.slice(1);

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, items: [], income: 0, expense: 0 };
      groups.push(currentGroup);
    }

    currentGroup.items.push(tx);
    if (tx.type === 'income') currentGroup.income += tx.amount;
    else if (tx.type === 'expense') currentGroup.expense += tx.amount;
  });

  function addTransactionAmount(row: SummaryRow, tx: Transaction) {
    row.count += 1;
    if (tx.type === 'income') row.income += tx.amount;
    else if (tx.type === 'expense') row.expense += tx.amount;
  }

  function formatShortDate(date: Date) {
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
    });
  }

  function startOfLocalWeek(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const day = start.getDay();
    const daysSinceMonday = (day + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    return start;
  }

  function buildDailySummaryRows(items: Transaction[]): DaySummaryRow[] {
    const rows: DaySummaryRow[] = [];
    let currentRow: DaySummaryRow | null = null;

    items.forEach((tx) => {
      const date = new Date(tx.transaction_date);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const label = date.toLocaleDateString(locale, {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      });

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
    const rows: WeekSummaryRow[] = [];
    let currentRow: WeekSummaryRow | null = null;

    items.forEach((tx) => {
      const date = new Date(tx.transaction_date);
      const weekStart = startOfLocalWeek(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const key = weekStart.toISOString().slice(0, 10);
      const label = `${t('transactions.label_week')} ${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;

      if (!currentRow || currentRow.key !== key) {
        currentRow = {
          key,
          label,
          count: 0,
          income: 0,
          expense: 0,
          startDate: weekStart.getTime(),
          endDate: weekEnd.getTime(),
          items: [],
        };
        rows.push(currentRow);
      }

      currentRow.items.push(tx);
      addTransactionAmount(currentRow, tx);
    });

    return rows;
  }

  function buildMonthlySummaryRows(items: Transaction[]): MonthSummaryRow[] {
    type DraftMonthSummaryRow = MonthSummaryRow & { items: Transaction[] };

    const rows: DraftMonthSummaryRow[] = [];
    let currentRow: DraftMonthSummaryRow | null = null;

    items.forEach((tx) => {
      const date = new Date(tx.transaction_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(locale, {
        month: 'long',
      });

      if (!currentRow || currentRow.key !== key) {
        currentRow = {
          key,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          count: 0,
          income: 0,
          expense: 0,
          weekRows: [],
          items: [],
        };
        rows.push(currentRow);
      }

      currentRow.items.push(tx);
      addTransactionAmount(currentRow, tx);
    });

    return rows.map(({ items: monthItems, ...row }) => ({
      ...row,
      weekRows: buildWeeklySummaryRows(monthItems),
    }));
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
                {t('transactions.label_income')}: {formatAmount(group.income, locale)}
              </div>
              <div style={{ color: '#e11d48' }}>
                {t('transactions.label_expense')}: {formatAmount(group.expense, locale)}
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                {t('transactions.label_balance')}:{' '}
                {formatAmount(group.income - group.expense, locale)}
              </div>
            </div>
          </div>

          {viewType === 'month' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {buildDailySummaryRows(group.items).map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() =>
                    onSelectSummaryRange?.({
                      startDate: row.startDate,
                      endDate: row.endDate,
                      title: row.label,
                    })
                  }
                  style={{
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    minHeight: '66px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    textAlign: 'left',
                    cursor: onSelectSummaryRange ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                      {row.label}
                    </div>
                    <div
                      style={{ marginTop: '3px', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                    >
                      {row.count}{' '}
                      {row.count === 1
                        ? t('transactions.records_one')
                        : t('transactions.records_many')}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '4px', textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#059669',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('transactions.label_income')}: {formatAmount(row.income, locale)}
                    </div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#e11d48',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('transactions.label_expense')}: {formatAmount(row.expense, locale)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : viewType === 'year' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {buildMonthlySummaryRows(group.items).map((monthRow) => {
                const isMonthExpanded = expandedMonthKey === monthRow.key;

                return (
                  <div
                    key={monthRow.key}
                    style={{
                      background: 'var(--surface)',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMonthKey((current) =>
                          current === monthRow.key ? null : monthRow.key,
                        )
                      }
                      aria-expanded={isMonthExpanded}
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
                          {monthRow.label}
                        </div>
                        <div
                          style={{
                            marginTop: '3px',
                            fontSize: '0.75rem',
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
                          {t('transactions.label_income')}: {formatAmount(monthRow.income, locale)}
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
                          {formatAmount(monthRow.expense, locale)}
                        </div>
                      </div>
                    </button>

                    {isMonthExpanded && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          background: '#f1f5f9',
                          borderTop: '1px solid var(--border)',
                          padding: '8px',
                        }}
                      >
                        {monthRow.weekRows.map((weekRow) => (
                          <button
                            key={`${monthRow.key}-${weekRow.key}`}
                            type="button"
                            onClick={() =>
                              onSelectSummaryRange?.({
                                startDate: weekRow.startDate,
                                endDate: weekRow.endDate,
                                title: weekRow.label,
                              })
                            }
                            style={{
                              padding: '9px 12px',
                              background: '#e2e8f0',
                              border: '1px solid #cbd5e1',
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
                                {weekRow.label}
                              </div>
                              <div
                                style={{
                                  marginTop: '2px',
                                  fontSize: '0.7rem',
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
                                {formatAmount(weekRow.income, locale)}
                              </div>
                              <div style={{ color: '#e11d48', whiteSpace: 'nowrap' }}>
                                {formatAmount(weekRow.expense, locale)}
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
