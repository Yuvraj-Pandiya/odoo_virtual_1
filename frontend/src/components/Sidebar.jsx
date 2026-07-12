import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Truck, Users, Route, Wrench,
  Fuel, BarChart3, LogOut, Zap, Settings
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'overview' },
  { to: '/vehicles', icon: Truck, label: 'Vehicles', section: 'fleet' },
  { to: '/drivers', icon: Users, label: 'Drivers', section: 'fleet' },
  { to: '/trips', icon: Route, label: 'Trip Management', section: 'operations' },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance', section: 'operations' },
  { to: '/fuel', icon: Fuel, label: 'Fuel & Expenses', section: 'finance' },
  { to: '/reports', icon: BarChart3, label: 'Reports & Analytics', section: 'finance' },
  { to: '/settings', icon: Settings, label: 'Settings', section: 'overview' },
];

const sections = {
  overview: 'Overview',
  fleet: 'Fleet Management',
  operations: 'Operations',
  finance: 'Finance',
};

const roleLabels = {
  fleet_manager: 'Fleet Manager',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

const roleRoutes = {
  fleet_manager: ['/vehicles', '/drivers', '/trips', '/maintenance', '/settings'],
  dispatcher: ['/dashboard', '/trips', '/settings'],
  safety_officer: ['/drivers', '/settings'],
  financial_analyst: ['/fuel', '/reports', '/settings']
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter nav items based on the user's role
  const allowedRoutes = roleRoutes[user?.role] || ['/settings'];
  const filteredNavItems = navItems.filter(item => allowedRoutes.includes(item.to));

  const grouped = filteredNavItems.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside className="logistica-sidebar">
      <div className="logistica-sidebar-logo">
        <Zap size={28} color="var(--logistica-primary)" strokeWidth={2.5} />
        <h2>TransitOps</h2>
      </div>

      <nav className="logistica-nav">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section} className="mb-3">
            <div className="text-muted" style={{ padding: '0 24px', fontSize: '12px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>
              {sections[section]}
            </div>
            {items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `logistica-nav-item${isActive ? ' active' : ''}`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="logistica-sidebar-footer">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--logistica-secondary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>{user?.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{roleLabels[user?.role]}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-icon"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
