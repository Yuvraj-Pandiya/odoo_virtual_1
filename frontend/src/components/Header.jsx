import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

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
  const page = pageTitles[location.pathname] || { title: 'Logistica', subtitle: '' };
  const now = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <header className="logistica-header">
      <div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>{page.title}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{page.subtitle}</div>
      </div>
      <div className="d-flex align-items-center gap-3">
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{now}</span>
        
        <button 
          className="btn-icon" 
          title="Toggle Theme"
          onClick={() => setIsDark(!isDark)}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="btn-icon" title="Notifications">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
