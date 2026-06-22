import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, ChevronDown, X } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { getAppLocale } from '@/shared/utils/locale';
import { logAppError, notifyAppError } from '@/core/telemetry/error.service';
import { useDisplayFormatSettings } from '@/shared/hooks/useDisplayFormatSettings';
import { formatAppDate, formatAppDateTime } from '@/shared/utils/display-format';

type QuickMode = 'today' | 'yesterday' | 'custom';

interface Props {
  /** Unix ms timestamp. Null means the user cleared the field. */
  value: number | null;
  onChange: (timestamp: number | null) => void;
  label?: string;
  required?: boolean;
  error?: string | null;
}

const INVALID_DATE_TIME_USER_MESSAGE = 'Ngày giờ không hợp lệ. Vui lòng chọn lại.';

function isValidTimestamp(ts: number | null | undefined): ts is number {
  return typeof ts === 'number' && Number.isFinite(ts);
}

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
}

function isValidTimeInput(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;

  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function toDateInput(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeInput(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function safeBuildTimestamp(dateStr: string, timeStr: string): number | null {
  try {
    if (!isValidDateInput(dateStr) || !isValidTimeInput(timeStr)) return null;

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    const timestamp = new Date(year, month - 1, day, hour, minute).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

function formatDateDisplay(
  dateStr: string,
  displayFormatSettings: ReturnType<typeof useDisplayFormatSettings>
): string {
  if (!dateStr) return '';

  const [year, month, day] = dateStr.split('-').map(Number);
  return formatAppDate(
    new Date(year, month - 1, day).getTime(),
    displayFormatSettings
  );
}

function formatPreview(
  ts: number,
  locale: string,
  displayFormatSettings: ReturnType<typeof useDisplayFormatSettings>
): string {
  const date = new Date(ts);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);

  return `${weekday}, ${formatAppDateTime(ts, displayFormatSettings, locale)}`;
}

function getDateTimePickerErrorContext(action: string, extra?: Record<string, unknown>) {
  return {
    screen: 'DateTimePicker',
    component: 'DateTimePicker',
    action,
    userMessage: INVALID_DATE_TIME_USER_MESSAGE,
    extra,
  };
}

function detectMode(ts: number): QuickMode {
  const now = new Date();
  const given = new Date(ts);
  const sameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDate(given, now)) return 'today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDate(given, yesterday)) return 'yesterday';
  return 'custom';
}

export function DateTimePicker({
  value,
  onChange,
  label,
  required = false,
  error = null,
}: Props) {
  const { t, language } = useLanguage();
  const locale = getAppLocale(language);
  const displayFormatSettings = useDisplayFormatSettings();
  const invalidMessage = t('date_time.invalid');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<QuickMode>(() => (
    isValidTimestamp(value) ? detectMode(value) : 'custom'
  ));
  const [dateStr, setDateStr] = useState(() => (
    isValidTimestamp(value) ? toDateInput(value) : ''
  ));
  const [timeStr, setTimeStr] = useState(() => (
    isValidTimestamp(value) ? toTimeInput(value) : ''
  ));
  const [internalError, setInternalError] = useState<string | null>(() => (
    value !== null && !isValidTimestamp(value) ? invalidMessage : null
  ));
  const [preview, setPreview] = useState<string | null>(null);

  const reportInvalidDateTime = useCallback((
    errorValue: unknown,
    action: string,
    extra?: Record<string, unknown>
  ) => {
    const context = getDateTimePickerErrorContext(action, extra);
    void notifyAppError(errorValue, context);
    void logAppError(errorValue, context);
  }, []);

  useEffect(() => {
    if (!isValidTimestamp(value)) {
      setMode('custom');
      setDateStr('');
      setTimeStr('');
      setInternalError(value === null ? null : invalidMessage);
      return;
    }

    setMode(detectMode(value));
    setDateStr(toDateInput(value));
    setTimeStr(toTimeInput(value));
    setInternalError(null);
  }, [value, invalidMessage]);

  useEffect(() => {
    if (!isValidTimestamp(value)) {
      setPreview(null);
      return;
    }

    try {
      setPreview(formatPreview(value, locale, displayFormatSettings));
    } catch (errorValue) {
      setPreview(null);
      setInternalError(invalidMessage);
      reportInvalidDateTime(errorValue, 'formatPreview', {
        value,
        locale,
        language,
      });
    }
  }, [value, locale, language, displayFormatSettings, invalidMessage, reportInvalidDateTime]);

  const commitIfValid = useCallback((nextDate: string, nextTime: string) => {
    const timestamp = safeBuildTimestamp(nextDate, nextTime);
    if (timestamp === null) {
      setInternalError(invalidMessage);
      reportInvalidDateTime(new Error('Invalid date/time input'), 'buildTimestamp', {
        date: nextDate,
        time: nextTime,
      });
      return;
    }

    setInternalError(null);
    onChange(timestamp);
  }, [onChange, invalidMessage]);

  const applyQuickMode = useCallback((m: QuickMode) => {
    setMode(m);
    if (m === 'custom') return;

    const now = new Date();
    if (m === 'yesterday') now.setDate(now.getDate() - 1);

    const d = toDateInput(now.getTime());
    const tValue = toTimeInput(Date.now());
    setDateStr(d);
    setTimeStr(tValue);
    commitIfValid(d, tValue);
  }, [commitIfValid]);

  const handleDateChange = useCallback((nextDate: string) => {
    setDateStr(nextDate);
    commitIfValid(nextDate, timeStr);
  }, [timeStr, commitIfValid]);

  const handleTimeChange = useCallback((nextTime: string) => {
    setTimeStr(nextTime);
    commitIfValid(dateStr, nextTime);
  }, [dateStr, commitIfValid]);

  const handleClear = useCallback(() => {
    setMode('custom');
    setDateStr('');
    setTimeStr('');
    setInternalError(invalidMessage);
    onChange(null);
  }, [onChange, invalidMessage]);

  const openDatePicker = useCallback(() => {
    const input = dateInputRef.current;
    if (!input) return;

    if (input.showPicker) {
      input.showPicker();
    } else {
      input.click();
    }
    input.focus();
  }, []);

  const CHIPS: { id: QuickMode; label: string }[] = [
    { id: 'yesterday', label: t('date_time.yesterday') },
    { id: 'today', label: t('date_time.today') },
    { id: 'custom', label: t('date_time.custom') },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-muted">
          {label ?? t('date_time.transaction_date')}{required ? ' *' : ''}
        </p>
        {value !== null && (
          <button
            type="button"
            onClick={handleClear}
            aria-label={t('date_time.clear')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-muted transition-all active:scale-95"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {CHIPS.map(chip => (
          <button
            key={chip.id}
            type="button"
            onClick={() => applyQuickMode(chip.id)}
            className={`flex-1 h-[40px] rounded-[10px] text-[13px] font-semibold
              transition-all active:scale-95 flex items-center justify-center gap-1
              ${
                mode === chip.id
                  ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
                  : 'bg-surface-muted text-muted'
              }`}
          >
            {chip.id === 'custom' && <ChevronDown size={13} />}
            {chip.label}
          </button>
        ))}
      </div>

      {mode === 'custom' && (
        <div className="flex gap-2">
          <label className="flex-[3] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
              <Calendar size={15} />
            </span>
            <input
              ref={dateInputRef}
              type="date"
              value={dateStr}
              onChange={e => handleDateChange(e.target.value)}
              onInvalid={e => e.preventDefault()}
              className="absolute bottom-0 left-0 h-px w-px opacity-0"
              tabIndex={-1}
              aria-hidden="true"
            />
            <input
              type="text"
              value={formatDateDisplay(dateStr, displayFormatSettings)}
              readOnly
              placeholder={t('date_time.select_date')}
              onClick={openDatePicker}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openDatePicker();
                }
              }}
              className="w-full h-[48px] pl-9 pr-3 bg-bg-subtle border border-border
                rounded-[12px] text-[14px] text-text font-medium
                focus:outline-none focus:border-primary appearance-none cursor-pointer"
            />
          </label>

          <label className="flex-[2] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
              <Clock size={15} />
            </span>
            <input
              type="time"
              value={timeStr}
              onChange={e => handleTimeChange(e.target.value)}
              onInvalid={e => e.preventDefault()}
              className="w-full h-[48px] pl-9 pr-3 bg-bg-subtle border border-border
                rounded-[12px] text-[14px] text-text font-medium
                focus:outline-none focus:border-primary appearance-none"
            />
          </label>
        </div>
      )}

      {internalError || error ? (
        <p className="text-[12px] font-medium text-rose-600 ml-0.5">{internalError ?? error}</p>
      ) : isValidTimestamp(value) && preview && (
        <p className="text-[11px] text-subtle ml-0.5">
          {'\uD83D\uDCC5'} {preview}
        </p>
      )}
    </div>
  );
}
