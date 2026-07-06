import { useLanguage } from '@/shared/context/LanguageContext';

type ReportType = 'cashflow' | 'budget';

interface Props {
  active: ReportType;
  onChange: (value: ReportType) => void;
}

export function ReportTypeTabs({ active, onChange }: Props) {
  const { t } = useLanguage();
  const tabs: Array<{ value: ReportType; label: string }> = [
    { value: 'cashflow', label: t('reports.cashflow_tab') },
    { value: 'budget', label: t('navigation.budgets') },
  ];

  return (
    <div
      className="mb-4 grid grid-cols-2 gap-2 rounded-[14px] bg-surface-muted p-1"
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
          className={`min-h-10 rounded-[10px] px-3 text-sm font-bold transition-colors ${
            active === tab.value
              ? 'bg-surface text-primary shadow-sm'
              : 'text-muted active:bg-surface/70'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
