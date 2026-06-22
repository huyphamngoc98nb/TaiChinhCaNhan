import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  Coins,
  Hash,
  RotateCcw,
  Rows3,
  type LucideIcon,
} from 'lucide-react';
import { DropdownList } from '@/shared/components/DropdownList';
import { useCurrency } from '@/shared/context/CurrencyContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { getAppLocale } from '@/shared/utils/locale';
import {
  formatAppAmount,
  formatAppDate,
  formatAppDateTime,
  formatAppMonth,
  formatAppTime,
  getEndOfWeek,
  getStartOfWeek,
} from '@/shared/utils/display-format';
import {
  AmountPrecision,
  CurrencyDisplayMode,
  CurrencyPosition,
  DateFormat,
  DisplayFormatSettings as DisplayFormatSettingsValue,
  MonthFormat,
  TimeFormat,
  WeekStart,
  getDisplayFormatSettings,
  resetDisplayFormatSettings,
  updateDisplayFormatSettings,
} from '../services/display-format-settings.service';

const previewTimestamp = new Date(2026, 5, 22, 14, 30).getTime();
const previewAmount = 1234567.89;

interface SettingLabelProps {
  icon: LucideIcon;
  label: string;
}

interface ToggleSettingProps {
  checked: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}

function SettingLabel({ icon: Icon, label }: SettingLabelProps) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
      <Icon size={16} className="text-indigo-500" />
      <span>{label}</span>
    </div>
  );
}

function ToggleSetting({
  checked,
  icon: Icon,
  title,
  description,
  onChange,
}: ToggleSettingProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-[12px] bg-bg px-3 py-3 text-left transition-colors active:bg-bg-subtle"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-text">{title}</p>
        <p className="text-[11px] leading-4 text-muted">{description}</p>
      </div>
      <span
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );
}

export function DisplayFormatSettings() {
  const { t, language } = useLanguage();
  const { currency } = useCurrency();
  const locale = getAppLocale(language);
  const [settings, setSettings] = useState<DisplayFormatSettingsValue>(() => (
    getDisplayFormatSettings()
  ));

  const dateFormatOptions = useMemo(() => [
    { value: 'dd/MM/yyyy' as const, label: 'dd/MM/yyyy' },
    { value: 'MM/dd/yyyy' as const, label: 'MM/dd/yyyy' },
    { value: 'yyyy-MM-dd' as const, label: 'yyyy-MM-dd' },
  ], []);

  const timeFormatOptions = useMemo(() => [
    { value: '24h' as const, label: '24h' },
    { value: '12h' as const, label: '12h' },
  ], []);

  const monthFormatOptions = useMemo(() => [
    { value: 'MM/yyyy' as const, label: 'MM/yyyy' },
    { value: 'MMM yyyy' as const, label: 'MMM yyyy' },
  ], []);

  const weekStartOptions = useMemo(() => [
    { value: 'monday' as const, label: t('settings.display_format_week_start_monday') },
    { value: 'sunday' as const, label: t('settings.display_format_week_start_sunday') },
  ], [t]);

  const currencyDisplayOptions = useMemo(() => [
    { value: 'symbol' as const, label: t('settings.display_format_currency_display_symbol') },
    { value: 'code' as const, label: t('settings.display_format_currency_display_code') },
    { value: 'none' as const, label: t('settings.display_format_currency_display_none') },
  ], [t]);

  const currencyPositionOptions = useMemo(() => [
    { value: 'auto' as const, label: t('settings.display_format_currency_position_auto') },
    { value: 'before' as const, label: t('settings.display_format_currency_position_before') },
    { value: 'after' as const, label: t('settings.display_format_currency_position_after') },
  ], [t]);

  const amountPrecisionOptions = useMemo(() => [
    {
      value: 'currency_default' as const,
      label: t('settings.display_format_amount_precision_currency_default'),
    },
    { value: 'integer' as const, label: t('settings.display_format_amount_precision_integer') },
  ], [t]);

  const weekPreview = useMemo(() => {
    const start = getStartOfWeek(new Date(previewTimestamp), settings).getTime();
    const end = getEndOfWeek(new Date(previewTimestamp), settings).getTime();

    return `${formatAppDate(start, settings)} - ${formatAppDate(end, settings)}`;
  }, [settings]);

  const previewRows = useMemo(() => [
    {
      label: t('settings.display_format_preview_date'),
      value: formatAppDate(previewTimestamp, settings),
    },
    {
      label: t('settings.display_format_preview_time'),
      value: formatAppTime(previewTimestamp, settings, locale),
    },
    {
      label: t('settings.display_format_preview_datetime'),
      value: formatAppDateTime(previewTimestamp, settings, locale),
    },
    {
      label: t('settings.display_format_preview_month'),
      value: formatAppMonth(previewTimestamp, settings, locale),
    },
    {
      label: t('settings.display_format_preview_amount'),
      value: formatAppAmount(previewAmount, currency, settings, locale),
    },
    {
      label: t('settings.display_format_preview_week'),
      value: weekPreview,
    },
  ], [currency, locale, settings, t, weekPreview]);

  const updateSettings = (patch: Partial<DisplayFormatSettingsValue>) => {
    setSettings(updateDisplayFormatSettings(patch));
  };

  const resetSettings = () => {
    setSettings(resetDisplayFormatSettings());
  };

  return (
    <div className="card">
      <div className="mb-4 flex items-center gap-2.5">
        <Rows3 size={20} className="text-primary" />
        <h3 className="m-0 text-[1.1rem] font-semibold">
          {t('settings.display_format_title')}
        </h3>
      </div>

      <p className="mb-4 text-[0.9rem] text-muted">{t('settings.display_format_desc')}</p>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <SettingLabel icon={CalendarDays} label={t('settings.display_format_date')} />
            <DropdownList<DateFormat>
              value={settings.dateFormat}
              onChange={(value) => updateSettings({ dateFormat: value })}
              ariaLabel={t('settings.display_format_date')}
              options={dateFormatOptions}
            />
          </div>

          <div className="space-y-1.5">
            <SettingLabel icon={Clock3} label={t('settings.display_format_time')} />
            <DropdownList<TimeFormat>
              value={settings.timeFormat}
              onChange={(value) => updateSettings({ timeFormat: value })}
              ariaLabel={t('settings.display_format_time')}
              options={timeFormatOptions}
            />
          </div>

          <div className="space-y-1.5">
            <SettingLabel icon={CalendarDays} label={t('settings.display_format_month')} />
            <DropdownList<MonthFormat>
              value={settings.monthFormat}
              onChange={(value) => updateSettings({ monthFormat: value })}
              ariaLabel={t('settings.display_format_month')}
              options={monthFormatOptions}
            />
          </div>

          <div className="space-y-1.5">
            <SettingLabel icon={CalendarDays} label={t('settings.display_format_week_start')} />
            <DropdownList<WeekStart>
              value={settings.weekStart}
              onChange={(value) => updateSettings({ weekStart: value })}
              ariaLabel={t('settings.display_format_week_start')}
              options={weekStartOptions}
            />
          </div>

          <div className="space-y-1.5">
            <SettingLabel icon={Coins} label={t('settings.display_format_currency_display')} />
            <DropdownList<CurrencyDisplayMode>
              value={settings.currencyDisplay}
              onChange={(value) => updateSettings({ currencyDisplay: value })}
              ariaLabel={t('settings.display_format_currency_display')}
              options={currencyDisplayOptions}
            />
          </div>

          <div className="space-y-1.5">
            <SettingLabel icon={Coins} label={t('settings.display_format_currency_position')} />
            <DropdownList<CurrencyPosition>
              value={settings.currencyPosition}
              onChange={(value) => updateSettings({ currencyPosition: value })}
              ariaLabel={t('settings.display_format_currency_position')}
              options={currencyPositionOptions}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <SettingLabel icon={Hash} label={t('settings.display_format_amount_precision')} />
            <DropdownList<AmountPrecision>
              value={settings.amountPrecision}
              onChange={(value) => updateSettings({ amountPrecision: value })}
              ariaLabel={t('settings.display_format_amount_precision')}
              options={amountPrecisionOptions}
            />
          </div>
        </div>

        <ToggleSetting
          checked={settings.useGrouping}
          icon={Hash}
          title={t('settings.display_format_grouping')}
          description={t('settings.display_format_grouping_desc')}
          onChange={(checked) => updateSettings({ useGrouping: checked })}
        />

        <div className="rounded-[12px] bg-bg px-3 py-3">
          <p className="mb-2 text-[13px] font-semibold text-text">
            {t('settings.display_format_preview')}
          </p>
          <div className="space-y-2">
            {previewRows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3 text-[12px]">
                <span className="shrink-0 text-muted">{row.label}</span>
                <span className="min-w-0 text-right font-semibold text-text">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={resetSettings}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border border-border bg-bg-subtle px-4 text-[13px] font-semibold text-text transition-colors active:bg-surface-muted"
        >
          <RotateCcw size={16} />
          <span>{t('settings.display_format_reset')}</span>
        </button>
      </div>
    </div>
  );
}
