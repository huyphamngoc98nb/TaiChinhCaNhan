const LOAN_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:(?:T|\s)(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

/**
 * Converts both date-only values and legacy ISO/SQLite datetimes to YYYY-MM-DD.
 * The calendar prefix is intentionally preserved instead of parsing through UTC,
 * so a stored due date cannot move to the previous or next local day.
 */
export function normalizeLoanDate(value?: string | null): string | null {
  if (!value) return null;

  const match = value.trim().match(LOAN_DATE_PATTERN);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!isValidCalendarDate(year, month, day)) return null;
  if (
    (hourText !== undefined && Number(hourText) > 23)
    || (minuteText !== undefined && Number(minuteText) > 59)
    || (secondText !== undefined && Number(secondText) > 59)
  ) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}`;
}

export function isLoanDateOnly(value: string): boolean {
  return normalizeLoanDate(value) === value;
}

export function loanDateToLocalTimestamp(value?: string | null): number | null {
  const normalized = normalizeLoanDate(value);
  if (!normalized) return null;

  const [year, month, day] = normalized.split('-').map(Number);
  const timestamp = new Date(year, month - 1, day).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function timestampToLoanDate(timestamp: number): string | null {
  if (!Number.isFinite(timestamp)) return null;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
