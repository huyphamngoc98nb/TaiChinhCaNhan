import { Outlet, NavLink } from 'react-router-dom';
import { Home, List, PlusCircle, Settings, BarChart3 } from 'lucide-react';
import './AppLayout.css';

export function AppLayout() {
  return (
    <div className="app-container">
      <main className="main-content">
        <Outlet />
      </main>
      
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <Home size={24} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <List size={24} />
          <span>History</span>
        </NavLink>
        <NavLink to="/transactions/new" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <PlusCircle size={24} />
          <span>Add</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={24} />
          <span>Settings</span>
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BarChart3 size={24} />
          <span>Reports</span>
        </NavLink>
      </nav>
    </div>
  );
}
