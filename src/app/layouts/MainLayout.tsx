import { Outlet, NavLink } from 'react-router-dom';
import { Home, List, PlusCircle, Settings, BarChart3, PiggyBank, Repeat } from 'lucide-react';
import { ROUTES } from '@/shared/constants/routes';
import { useLanguage } from '@/shared/context/LanguageContext';
import './MainLayout.css';

export function MainLayout() {
  const { t } = useLanguage();

  return (
    <div className="app-container">
      <main className="main-content">
        <Outlet />
      </main>
      
      <nav className="bottom-nav">
        <NavLink to={ROUTES.HOME} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <Home size={24} />
          <span>{t('navigation.home')}</span>
        </NavLink>
        <NavLink to={ROUTES.TRANSACTIONS} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <List size={24} />
          <span>{t('navigation.history')}</span>
        </NavLink>
        <NavLink to={ROUTES.TRANSACTIONS_NEW} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PlusCircle size={24} />
          <span>{t('navigation.add')}</span>
        </NavLink>
        <NavLink to="/budgets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PiggyBank size={24} />
          <span>{t('navigation.budgets')}</span>
        </NavLink>
        <NavLink to={ROUTES.SETTINGS} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={24} />
          <span>{t('navigation.settings')}</span>
        </NavLink>
      </nav>
    </div>
  );
}
