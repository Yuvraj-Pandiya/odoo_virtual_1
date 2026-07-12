import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { role: 'Fleet Manager', email: 'fleet@transitops.com', color: '#6366f1' },
  { role: 'Driver', email: 'driver@transitops.com', color: '#06b6d4' },
  { role: 'Safety Officer', email: 'safety@transitops.com', color: '#10b981' },
  { role: 'Financial Analyst', email: 'finance@transitops.com', color: '#f59e0b' },
];

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome to TransitOps!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email) => {
    setForm({ email, password: 'password123' });
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={28} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="login-title">TransitOps</div>
            <div className="login-subtitle">Smart Transport Operations Platform</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@transitops.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ paddingRight: 44 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger">
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <button id="login-submit-btn" type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="divider" style={{ margin: '20px 0 16px' }} />

        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12 }}>
            Demo Accounts (password: password123)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO_ACCOUNTS.map(({ role, email, color }) => (
              <button
                key={email}
                id={`demo-${role.toLowerCase().replace(' ', '-')}`}
                type="button"
                onClick={() => fillDemo(email)}
                style={{
                  background: `${color}14`, border: `1px solid ${color}30`,
                  borderRadius: 'var(--radius-sm)', padding: '8px 10px',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 150ms'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${color}60`}
                onMouseLeave={e => e.currentTarget.style.borderColor = `${color}30`}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 2 }}>{role}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
