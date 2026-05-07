import { Outlet, NavLink } from 'react-router-dom';
import { Home, List, PlusCircle, Settings, BarChart3 } from 'lucide-react';
import { ROUTES } from '@/shared/constants/routes';
import './MainLayout.css';

export function MainLayout() {
  return (
    <div className="app-container">
      <main className="main-content">
        <Outlet />
      </main>
      
      <nav className="bottom-nav">
        <NavLink to={ROUTES.HOME} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <Home size={24} />
          <span>Home</span>
        </NavLink>
        <NavLink to={ROUTES.TRANSACTIONS} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <List size={24} />
          <span>History</span>
        </NavLink>
        <NavLink to={ROUTES.TRANSACTIONS_NEW} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PlusCircle size={24} />
          <span>Add</span>
        </NavLink>
        <NavLink to={ROUTES.REPORTS} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart3 size={24} />
          <span>Reports</span>
        </NavLink>
        <NavLink to={ROUTES.SETTINGS} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={24} />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
}
