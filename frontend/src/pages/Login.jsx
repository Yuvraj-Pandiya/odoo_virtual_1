import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Zap, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'financial_analyst', label: 'Financial Analyst' }
];

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'dispatcher' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password || !form.role) {
      setError('Please enter email, password, and select your role.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email, form.password, form.role);
      toast.success('Welcome to TransitOps!');
      
      // Scoped redirection based on user role
      if (user.role === 'fleet_manager') {
        navigate('/vehicles');
      } else if (user.role === 'dispatcher') {
        navigate('/dashboard');
      } else if (user.role === 'safety_officer') {
        navigate('/drivers');
      } else if (user.role === 'financial_analyst') {
        navigate('/fuel');
      } else {
        navigate('/dashboard');
      }
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
      
      toast.success('Account created successfully!');
      
      // Auto redirect based on role
      if (data.user.role === 'fleet_manager') {
        window.location.href = '/vehicles';
      } else if (data.user.role === 'dispatcher') {
        window.location.href = '/dashboard';
      } else if (data.user.role === 'safety_officer') {
        window.location.href = '/drivers';
      } else if (data.user.role === 'financial_analyst') {
        window.location.href = '/fuel';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setError('');
    setForm({ name: '', email: '', password: '', role: 'dispatcher' });
    setMode(m => m === 'login' ? 'register' : 'login');
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      <div className="login-card" style={{ maxWidth: '440px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '32px', fontFamily: '"Comic Sans MS", cursive, sans-serif', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '4px' }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'Enter your credentials to continue' : 'Join our operations team today'}
          </p>
        </div>

        {mode === 'login' ? (
          <>
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>EMAIL</label>
                <input
                  type="email"
                  className="logistica-input"
                  placeholder="Raven.k@transitops.in"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="logistica-input"
                    style={{ paddingRight: '44px' }}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
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
                <label className="form-label" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>ROLE (RBAC)</label>
                <select
                  className="form-select"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)' }}
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  required
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--logistica-primary)' }}
                  />
                  Remember me
                </label>
                <a href="#forgot" style={{ color: 'var(--logistica-primary)', textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); toast.error("Contact your fleet administrator to reset password."); }}>
                  Forgot password?
                </a>
              </div>

              {error && (
                <div className="logistica-alert logistica-alert-danger">
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-logistica"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px'
                }}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Don't have an account? </span>
              <button
                type="button"
                onClick={toggleMode}
                style={{ background: 'none', border: 'none', color: 'var(--logistica-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                Create one
              </button>
            </div>

            <div className="divider" style={{ margin: '20px 0 16px', opacity: 0.2 }} />

            <div style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8' }}>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>Access is scoped by role after login:</div>
              <ul style={{ paddingLeft: '16px', listStyleType: 'disc' }}>
                <li>Fleet Manager &rarr; Fleet, Maintenance</li>
                <li>Dispatcher &rarr; Dashboard, Trips</li>
                <li>Safety Officer &rarr; Drivers, Compliance</li>
                <li>Financial Analyst &rarr; Fuel &amp; Expenses, Analytics</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>FULL NAME</label>
                <input
                  type="text"
                  className="logistica-input"
                  placeholder="Yuvraj Pandiya"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  className="logistica-input"
                  placeholder="Raven.k@transitops.in"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="logistica-input"
                    style={{ paddingRight: '44px' }}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
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
                <label className="form-label" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>ROLE (RBAC) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select
                  className="form-select"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)' }}
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  required
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="logistica-alert logistica-alert-danger">
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-logistica"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px'
                }}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={toggleMode}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '500'
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
