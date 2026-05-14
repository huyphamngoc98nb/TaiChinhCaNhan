import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { DatabaseDiagnostics } from '../components/DatabaseDiagnostics';
import { CheckUpdateButton } from '../components/CheckUpdateButton';
import { LanguageSettings } from '../components/LanguageSettings';
import { CurrencySettings } from '../components/CurrencySettings';
import { useLanguage } from '@/shared/context/LanguageContext';
import {
  Database,
  ChevronRight,
  Wallet,
  BarChart3,
  RefreshCcw,
  Download,
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
      desc: 'Quản lý ví tiền mặt, ngân hàng, thẻ tín dụng',
      route: ROUTES.WALLETS,
    },
    {
      icon: <BarChart3 size={20} />,
      iconBg: 'rgba(16,185,129,0.12)',
      iconColor: '#10B981',
      label: t('navigation.reports'),
      desc: 'Xem báo cáo thu chi theo thời gian',
      route: ROUTES.REPORTS,
    },
    {
      icon: <RefreshCcw size={20} />,
      iconBg: 'rgba(245,158,11,0.12)',
      iconColor: '#F59E0B',
      label: t('recurring_bills.title'),
      desc: 'Quản lý và nhắc nhở hóa đơn hàng tháng',
      route: ROUTES.RECURRING_BILLS,
    },
    {
      icon: <Download size={20} />,
      iconBg: 'rgba(14,165,233,0.12)',
      iconColor: '#0EA5E9',
      label: t('reports.export'),
      desc: 'Xuất báo cáo sang file Excel, CSV',
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
    <div className="min-h-screen bg-[#F5F7FA]">
      <div className="px-4 pt-10 pb-2">
        <h1 className="text-[24px] font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-[12px] text-gray-500 mt-0.5">Tùy chỉnh ứng dụng</p>
      </div>

      <div className="px-4 pb-24 space-y-4 mt-4">
        {/* Language + Currency */}
        <div className="bg-white rounded-[16px] divide-y divide-gray-100 overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div className="px-4 py-3"><LanguageSettings /></div>
          <div className="px-4 py-3"><CurrencySettings /></div>
        </div>

        {/* Navigation menu items */}
        <div className="bg-white rounded-[16px] divide-y divide-gray-100 overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          {menuItems.map(item => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
                style={{ background: item.iconBg, color: item.iconColor }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900">{item.label}</p>
                <p className="text-[11px] text-gray-500 truncate">{item.desc}</p>
              </div>
              <ChevronRight size={18} className="text-gray-300 shrink-0" />
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[16px] overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div className="px-4 py-3">
            <CheckUpdateButton />
          </div>
        </div>

        {/* DB Diagnostics */}
        <div className="bg-white rounded-[16px] overflow-hidden"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div className="px-4 py-3">
            <DatabaseDiagnostics />
          </div>
        </div>
      </div>
    </div>
  );
}
