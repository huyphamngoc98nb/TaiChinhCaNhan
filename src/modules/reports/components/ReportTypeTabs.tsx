import { useLanguage } from '@/shared/context/LanguageContext';

type ReportType = 'cashflow' | 'budget';

interface Props {
  active: ReportType;
  onChange: (value: ReportType) => void;
}

export function ReportTypeTabs({ active, onChange }: Props) {
  const { t } = useLanguage();
  const focusRingClasses =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--focus-ring-offset)]';
  const tabs: Array<{ value: ReportType; label: string }> = [
    { value: 'cashflow', label: t('reports.cashflow_tab') },
    { value: 'budget', label: t('navigation.budgets') },
  ];

  return (
    <div
      className="mb-4 grid grid-cols-2 gap-1 rounded-[10px] border border-border bg-surface-muted p-0.5"
      role="tablist"
      aria-label={t('reports.title')}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
          className={`min-h-9 min-w-0 whitespace-nowrap rounded-[8px] border px-3 text-xs font-semibold transition-colors ${focusRingClasses} ${
            active === tab.value
              ? 'border-[var(--selected-border)] bg-surface text-[var(--selected-text)]'
              : 'border-transparent text-muted active:bg-surface'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
