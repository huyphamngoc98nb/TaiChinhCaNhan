import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/shared/context/LanguageContext';
import { getAppLocale } from '@/shared/utils/locale';

// ─── types ───────────────────────────────────────────────────────────────
type QuickMode = 'today' | 'yesterday' | 'custom';

interface Props {
  /** Unix ms timestamp */
  value: number;
  onChange: (timestamp: number) => void;
  label?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────
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

function buildTimestamp(dateStr: string, timeStr: string): number {
  return new Date(`${dateStr}T${timeStr}`).getTime();
}

function formatPreview(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

/** Detect if today or yesterday relative to now */
function detectMode(ts: number): QuickMode {
  const now   = new Date();
  const given = new Date(ts);
  const sameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

  if (sameDate(given, now)) return 'today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDate(given, yesterday)) return 'yesterday';
  return 'custom';
}

// ─── component ───────────────────────────────────────────────────────────
export function DateTimePicker({ value, onChange, label }: Props) {
  const { t, language } = useLanguage();
  const locale = getAppLocale(language);
  const [mode, setMode]       = useState<QuickMode>(() => detectMode(value));
  const [dateStr, setDateStr] = useState(() => toDateInput(value));
  const [timeStr, setTimeStr] = useState(() => toTimeInput(value));

  // Khi value đổi từ bên ngoài (ví dụ load existing), sync lại
  useEffect(() => {
    setMode(detectMode(value));
    setDateStr(toDateInput(value));
    setTimeStr(toTimeInput(value));
  }, [value]);

  const applyQuickMode = useCallback((m: QuickMode) => {
    setMode(m);
    if (m === 'custom') return; // giữ nguyên date/time hiện tại, mở picker

    const now = new Date();
    if (m === 'yesterday') now.setDate(now.getDate() - 1);
    // giữ giờ hiện tại
    const d   = toDateInput(now.getTime());
    const t   = toTimeInput(Date.now());
    setDateStr(d);
    setTimeStr(t);
    onChange(buildTimestamp(d, t));
  }, [onChange]);

  const handleDateChange = useCallback((d: string) => {
    setDateStr(d);
    onChange(buildTimestamp(d, timeStr));
  }, [timeStr, onChange]);

  const handleTimeChange = useCallback((t: string) => {
    setTimeStr(t);
    onChange(buildTimestamp(dateStr, t));
  }, [dateStr, onChange]);

  const CHIPS: { id: QuickMode; label: string }[] = [
    { id: 'yesterday', label: t('date_time.yesterday') },
    { id: 'today',     label: t('date_time.today') },
    { id: 'custom',    label: t('date_time.custom') },
  ];

  return (
    <div className="space-y-2.5">
      {/* Label */}
      <p className="text-[13px] font-semibold text-gray-700">{label ?? t('date_time.transaction_date')}</p>

      {/* Quick chips */}
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
                  : 'bg-gray-100 text-gray-600'
              }`}
          >
            {chip.id === 'custom' && <ChevronDown size={13} />}
            {chip.label}
          </button>
        ))}
      </div>

      {/* Custom pickers — chỉ hiện khi chọn 'Tùy chọn' */}
      {mode === 'custom' && (
        <div className="flex gap-2">
          {/* Date */}
          <label className="flex-[3] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
              <Calendar size={15} />
            </span>
            <input
              type="date"
              value={dateStr}
              onChange={e => handleDateChange(e.target.value)}
              className="w-full h-[48px] pl-9 pr-3 bg-gray-50 border border-gray-200
                rounded-[12px] text-[14px] text-gray-800 font-medium
                focus:outline-none focus:border-indigo-400 appearance-none"
            />
          </label>

          {/* Time */}
          <label className="flex-[2] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
              <Clock size={15} />
            </span>
            <input
              type="time"
              value={timeStr}
              onChange={e => handleTimeChange(e.target.value)}
              className="w-full h-[48px] pl-9 pr-3 bg-gray-50 border border-gray-200
                rounded-[12px] text-[14px] text-gray-800 font-medium
                focus:outline-none focus:border-indigo-400 appearance-none"
            />
          </label>
        </div>
      )}

      {/* Preview */}
      <p className="text-[11px] text-gray-400 ml-0.5">
        📅 {formatPreview(buildTimestamp(dateStr, timeStr), locale)}
      </p>
    </div>
  );
}
