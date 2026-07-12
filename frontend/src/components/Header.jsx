import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell } from 'lucide-react';

const pageTitles = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Fleet operations overview' },
  '/vehicles': { title: 'Vehicle Registry', subtitle: 'Manage your fleet assets' },
  '/drivers': { title: 'Driver Management', subtitle: 'Driver profiles and compliance' },
  '/trips': { title: 'Trip Management', subtitle: 'Dispatch and track deliveries' },
  '/maintenance': { title: 'Maintenance', subtitle: 'Vehicle service and repair logs' },
  '/fuel': { title: 'Fuel & Expenses', subtitle: 'Operational cost tracking' },
  '/reports': { title: 'Reports & Analytics', subtitle: 'Performance insights and KPIs' },
  '/settings': { title: 'Settings & RBAC', subtitle: 'Manage profile, permissions, and operational thresholds' },
};

export default function Header() {
  const location = useLocation();
  const { user } = useAuth();
  const page = pageTitles[location.pathname] || { title: 'TransitOps', subtitle: '' };
  const now = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <header className="header">
      <div>
        <div className="header-title">{page.title}</div>
        <div className="header-subtitle">{page.subtitle}</div>
      </div>
      <div className="header-actions">
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{now}</span>
        <button className="btn btn-icon btn-secondary" title="Notifications">
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}
