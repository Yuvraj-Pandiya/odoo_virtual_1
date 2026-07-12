import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Zap, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { role: 'Fleet Manager', email: 'fleet@transitops.com', color: '#6366f1' },
  { role: 'Driver', email: 'driver@transitops.com', color: '#06b6d4' },
  { role: 'Safety Officer', email: 'safety@transitops.com', color: '#10b981' },
  { role: 'Financial Analyst', email: 'finance@transitops.com', color: '#f59e0b' },
];

const ROLES = [
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'driver', label: 'Driver' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'financial_analyst', label: 'Financial Analyst' }
];

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'driver' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
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

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    const { name, email, password, role } = form;
    if (!name || !email || !password || !role) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password, role });
      localStorage.setItem('transitops_token', data.token);
      localStorage.setItem('transitops_user', JSON.stringify(data.user));
      // Trigger a page refresh to reload context state & route correctly
      toast.success('Account created! Welcome to TransitOps.');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email) => {
    setForm(f => ({ ...f, email, password: 'password123' }));
    setError('');
  };

  const toggleMode = () => {
    setError('');
    setForm({ name: '', email: '', password: '', role: 'driver' });
    setMode(m => m === 'login' ? 'register' : 'login');
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      <div className="login-card" style={{ maxWidth: mode === 'register' ? '460px' : '420px' }}>
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={28} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="login-title">TransitOps</div>
            <div className="login-subtitle">Smart Transport Operations Platform</div>
          </div>
        </div>

        {mode === 'login' ? (
          <>
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Don't have an account? </span>
              <button
                id="toggle-register-btn"
                type="button"
                onClick={toggleMode}
                style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >
                Create one
              </button>
            </div>

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
          </>
        ) : (
          <>
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="register-name">Full Name</label>
                <input
                  id="register-name"
                  type="text"
                  className="form-input"
                  placeholder="Yuvraj Pandiya"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-email">Email Address</label>
                <input
                  id="register-email"
                  type="email"
                  className="form-input"
                  placeholder="you@transitops.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ paddingRight: 44 }}
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

              <div className="form-group">
                <label className="form-label" htmlFor="register-role">Assign Role</label>
                <select
                  id="register-role"
                  className="form-select"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="alert alert-danger">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}

              <button id="register-submit-btn" type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={toggleMode}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500
                }}
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
