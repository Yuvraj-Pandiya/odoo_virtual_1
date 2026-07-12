import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Truck, Users, Route, Wrench,
  Fuel, BarChart3, LogOut, Zap
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'overview' },
  { to: '/vehicles', icon: Truck, label: 'Vehicles', section: 'fleet' },
  { to: '/drivers', icon: Users, label: 'Drivers', section: 'fleet' },
  { to: '/trips', icon: Route, label: 'Trip Management', section: 'operations' },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance', section: 'operations' },
  { to: '/fuel', icon: Fuel, label: 'Fuel & Expenses', section: 'finance' },
  { to: '/reports', icon: BarChart3, label: 'Reports & Analytics', section: 'finance' },
];

const sections = {
  overview: 'Overview',
  fleet: 'Fleet Management',
  operations: 'Operations',
  finance: 'Finance',
};

const roleLabels = {
  fleet_manager: 'Fleet Manager',
  driver: 'Driver',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const grouped = navItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={20} color="white" strokeWidth={2.5} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">TransitOps</span>
          <span className="sidebar-logo-sub">Fleet Platform</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section}>
            <div className="nav-section-label">{sections[section]}</div>
            {items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Icon size={18} className="nav-icon" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{roleLabels[user?.role]}</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-icon btn-secondary"
            title="Logout"
            style={{ padding: '6px', marginLeft: 'auto' }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
