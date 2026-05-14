import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  List,
  PlusCircle,
  PieChart,
  MoreHorizontal,
  BarChart3,
  Wallet,
  RefreshCcw,
  Settings,
  X,
  Download,
  Database,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants/routes';
import { ApkDownloadProgress } from '@/shared/components/ApkDownloadProgress';
import { useLanguage } from '@/shared/context/LanguageContext';
import './MainLayout.css';

export function MainLayout() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuItems = [
    { icon: <Wallet size={22} />, label: t('wallets.title'), route: ROUTES.WALLETS },
    { icon: <BarChart3 size={22} />, label: t('navigation.reports'), route: ROUTES.REPORTS },
    { icon: <RefreshCcw size={22} />, label: t('recurring_bills.title'), route: ROUTES.RECURRING_BILLS },
    { icon: <Download size={22} />, label: t('reports.export'), route: ROUTES.EXPORT },
    { icon: <Database size={22} />, label: t('settings.backup_restore'), route: ROUTES.BACKUP },
    { icon: <Settings size={22} />, label: t('navigation.settings'), route: ROUTES.SETTINGS },
  ];

  return (
    <div className="app-container">
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom Nav - 5 tabs */}
      <nav className="bottom-nav">
        <NavLink to={ROUTES.HOME} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <Home size={22} />
          <span>{t('navigation.home')}</span>
        </NavLink>
        <NavLink to={ROUTES.TRANSACTIONS} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <List size={22} />
          <span>{t('navigation.history')}</span>
        </NavLink>
        <NavLink
          to={ROUTES.TRANSACTIONS_NEW}
          className={({ isActive }) => `nav-item nav-item--fab ${isActive ? 'active' : ''}`}
        >
          <PlusCircle size={28} />
        </NavLink>
        <NavLink to={ROUTES.BUDGETS} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PieChart size={22} />
          <span>{t('navigation.budgets')}</span>
        </NavLink>
        <button className="nav-item" onClick={() => setDrawerOpen(true)}>
          <MoreHorizontal size={22} />
          <span>{t('navigation.more')}</span>
        </button>
      </nav>

      {/* Bottom Drawer */}
      {drawerOpen && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="drawer-sheet">
            <div className="drawer-handle" />
            <div className="drawer-header">
              <span className="drawer-title">{t('navigation.more')}</span>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="drawer-grid">
              {menuItems.map(item => (
                <button
                  key={item.route}
                  className="drawer-grid-item"
                  onClick={() => { navigate(item.route); setDrawerOpen(false); }}
                >
                  <div className="drawer-grid-icon">{item.icon}</div>
                  <span className="drawer-grid-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <ApkDownloadProgress />
    </div>
  );
}
