import type { Transaction } from '../domain/transaction.model';

export interface TransactionSummary {
  count: number;
  income: number;
  expense: number;
  balance: number;
}

export interface TransactionGroup extends TransactionSummary {
  key: string;
  label: string;
  items: Transaction[];
}

export interface DaySummaryRow extends TransactionSummary {
  key: string;
  label: string;
  startDate: number;
  endDate: number;
}

export interface WeekSummaryRow extends TransactionSummary {
  key: string;
  label: string;
  dayRows: DaySummaryRow[];
}

export interface YearMonthSummaryRow extends TransactionSummary {
  key: string;
  label: string;
  startDate: number;
  endDate: number;
}

export interface QuarterSummaryRow extends TransactionSummary {
  key: string;
  label: string;
  monthRows: YearMonthSummaryRow[];
}

interface MutableTransactionSummary {
  count: number;
  income: number;
  expense: number;
}

function createMutableSummary(): MutableTransactionSummary {
  return { count: 0, income: 0, expense: 0 };
}

function finalizeSummary(summary: MutableTransactionSummary): TransactionSummary {
  return {
    ...summary,
    balance: summary.income - summary.expense,
  };
}

export function addTransactionToSummary(
  summary: MutableTransactionSummary,
  transaction: Transaction,
) {
  summary.count += 1;

  if (transaction.exclude_from_total || transaction.is_budget_offset) {
    return;
  }

  if (transaction.type === 'income') {
    summary.income += transaction.amount;
  } else if (transaction.type === 'expense') {
    summary.expense += transaction.amount;
  }
}

export function summarizeTransactions(transactions: readonly Transaction[]): TransactionSummary {
  const summary = createMutableSummary();
  transactions.forEach((transaction) => addTransactionToSummary(summary, transaction));
  return finalizeSummary(summary);
}

export function sortTransactionsNewestFirst(
  transactions: readonly Transaction[],
): Transaction[] {
  return [...transactions].sort((left, right) => {
    const dateDifference = right.transaction_date - left.transaction_date;
    return dateDifference || right.created_at - left.created_at;
  });
}

export function groupTransactions(
  transactions: readonly Transaction[],
  getKey: (transaction: Transaction) => string,
  getLabel: (transaction: Transaction) => string,
): TransactionGroup[] {
  const groups = new Map<string, { label: string; items: Transaction[] }>();

  sortTransactionsNewestFirst(transactions).forEach((transaction) => {
    const key = getKey(transaction);
    const group = groups.get(key);

    if (group) {
      group.items.push(transaction);
    } else {
      groups.set(key, {
        label: getLabel(transaction),
        items: [transaction],
      });
    }
  });

  return [...groups.entries()].map(([key, group]) => ({
    key,
    label: group.label,
    items: group.items,
    ...summarizeTransactions(group.items),
  }));
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildDailySummaryRows(
  transactions: readonly Transaction[],
  getLabel: (transaction: Transaction) => string,
): DaySummaryRow[] {
  return groupTransactions(
    transactions,
    (transaction) => toLocalDateKey(new Date(transaction.transaction_date)),
    getLabel,
  ).map((group) => {
    const date = new Date(group.items[0].transaction_date);

    return {
      key: group.key,
      label: group.label,
      count: group.count,
      income: group.income,
      expense: group.expense,
      balance: group.balance,
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
  });
}

export function buildWeeklySummaryRows(
  transactions: readonly Transaction[],
  getWeekStart: (date: Date) => Date,
  getWeekEnd: (date: Date) => Date,
  getWeekLabel: (start: Date, end: Date) => string,
  getDayLabel: (transaction: Transaction) => string,
): WeekSummaryRow[] {
  const weekGroups = groupTransactions(
    transactions,
    (transaction) => toLocalDateKey(getWeekStart(new Date(transaction.transaction_date))),
    (transaction) => {
      const date = new Date(transaction.transaction_date);
      return getWeekLabel(getWeekStart(date), getWeekEnd(date));
    },
  );

  return weekGroups.map((group) => ({
    key: group.key,
    label: group.label,
    count: group.count,
    income: group.income,
    expense: group.expense,
    balance: group.balance,
    dayRows: buildDailySummaryRows(group.items, getDayLabel),
  }));
}

export function buildQuarterSummaryRows(
  transactions: readonly Transaction[],
  getQuarterLabel: (quarter: number) => string,
  getMonthLabel: (timestamp: number) => string,
): QuarterSummaryRow[] {
  const quarterGroups = groupTransactions(
    transactions,
    (transaction) => {
      const date = new Date(transaction.transaction_date);
      return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    },
    (transaction) => {
      const quarter = Math.floor(new Date(transaction.transaction_date).getMonth() / 3) + 1;
      return getQuarterLabel(quarter);
    },
  );

  return quarterGroups.map((quarterGroup) => {
    const monthGroups = groupTransactions(
      quarterGroup.items,
      (transaction) => {
        const date = new Date(transaction.transaction_date);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      },
      (transaction) => getMonthLabel(transaction.transaction_date),
    );

    return {
      key: quarterGroup.key,
      label: quarterGroup.label,
      count: quarterGroup.count,
      income: quarterGroup.income,
      expense: quarterGroup.expense,
      balance: quarterGroup.balance,
      monthRows: monthGroups.map((monthGroup) => {
        const date = new Date(monthGroup.items[0].transaction_date);
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

        return {
          key: monthGroup.key,
          label: monthGroup.label,
          count: monthGroup.count,
          income: monthGroup.income,
          expense: monthGroup.expense,
          balance: monthGroup.balance,
          startDate: startDate.getTime(),
          endDate: endDate.getTime(),
        };
      }),
    };
  });
}
