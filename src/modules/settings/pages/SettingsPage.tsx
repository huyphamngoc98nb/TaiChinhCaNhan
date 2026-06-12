import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { BackButton } from '@/shared/components/BackButton';
import { DatabaseDiagnostics } from '../components/DatabaseDiagnostics';
import { LanguageSettings } from '../components/LanguageSettings';
import { CurrencySettings } from '../components/CurrencySettings';
import { SecuritySettings } from '../components/SecuritySettings';
import { ThemeSelector } from '../components/ThemeSelector';
import { useLanguage } from '@/shared/context/LanguageContext';
import {
  Database,
  ChevronRight,
  Wallet,
  BarChart3,
  RefreshCcw,
  Download,
  Tags,
} from 'lucide-react';

interface MenuItem {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  desc: string;
  route: string;
}

export function SettingsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const menuItems: MenuItem[] = [
    {
      icon: <Wallet size={20} />,
      iconBg: 'rgba(99,102,241,0.12)',
      iconColor: '#6366F1',
      label: t('wallets.title'),
      desc: t('settings.wallets_desc'),
      route: ROUTES.WALLETS,
    },
    {
      icon: <Tags size={20} />,
      iconBg: 'rgba(139,92,246,0.12)',
      iconColor: '#8B5CF6',
      label: t('categories.title'),
      desc: t('settings.categories_desc'),
      route: ROUTES.CATEGORIES,
    },
    {
      icon: <BarChart3 size={20} />,
      iconBg: 'rgba(16,185,129,0.12)',
      iconColor: '#10B981',
      label: t('navigation.reports'),
      desc: t('settings.reports_desc'),
      route: ROUTES.REPORTS,
    },
    {
      icon: <RefreshCcw size={20} />,
      iconBg: 'rgba(245,158,11,0.12)',
      iconColor: '#F59E0B',
      label: t('recurring_bills.title'),
      desc: t('settings.recurring_bills_desc'),
      route: ROUTES.RECURRING_BILLS,
    },
    {
      icon: <Download size={20} />,
      iconBg: 'rgba(14,165,233,0.12)',
      iconColor: '#0EA5E9',
      label: t('reports.export'),
      desc: t('settings.export_desc'),
      route: ROUTES.EXPORT,
    },
    {
      icon: <Database size={20} />,
      iconBg: 'rgba(14,165,233,0.1)',
      iconColor: '#6366F1',
      label: t('settings.backup_restore'),
      desc: t('settings.backup_restore_desc'),
      route: ROUTES.BACKUP,
    },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <BackButton onClick={() => navigate(ROUTES.HOME)} ariaLabel={t('common.back')} />
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-bold text-text">{t('settings.title')}</h1>
          <p className="text-[12px] text-muted">{t('settings.app_customization')}</p>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-4">
        {/* Language + Currency */}
        <div className="bg-surface rounded-[16px] divide-y divide-border overflow-hidden border border-border"
          style={{ boxShadow: '0 1px 4px var(--shadow-color)' }}>
          <div className="px-4 py-3"><ThemeSelector /></div>
          <div className="px-4 py-3"><LanguageSettings /></div>
          <div className="px-4 py-3"><CurrencySettings /></div>
        </div>

        <SecuritySettings />

        {/* Navigation menu items */}
        <div className="bg-surface rounded-[16px] divide-y divide-border overflow-hidden border border-border"
          style={{ boxShadow: '0 1px 4px var(--shadow-color)' }}>
          {menuItems.map(item => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-bg-subtle transition-colors"
            >
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: item.iconBg, color: item.iconColor }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-text">{item.label}</p>
                <p className="text-[11px] text-muted truncate">{item.desc}</p>
              </div>
              <ChevronRight size={18} className="text-gray-300 shrink-0" />
            </button>
          ))}
        </div>

        {/* DB Diagnostics */}
        <div className="bg-surface rounded-[16px] overflow-hidden border border-border"
          style={{ boxShadow: '0 1px 4px var(--shadow-color)' }}>
          <div className="px-4 py-3">
            <DatabaseDiagnostics />
          </div>
        </div>
      </div>
    </div>
  );
}
