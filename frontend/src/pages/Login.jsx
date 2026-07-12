import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Zap, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// Google 'G' SVG icon — official Google brand colors
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const DEMO_ACCOUNTS = [
  { role: 'Fleet Manager', email: 'fleet@transitops.com', color: '#6366f1' },
  { role: 'Dispatcher', email: 'driver@transitops.com', color: '#06b6d4' },
  { role: 'Safety Officer', email: 'safety@transitops.com', color: '#10b981' },
  { role: 'Financial Analyst', email: 'finance@transitops.com', color: '#f59e0b' },
];

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read ?error param set by backend on OAuth2 rejection (e.g., local account conflict)
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError('');
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success('Welcome to TransitOps!');
      
      // Auto redirect based on role
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

  const fillDemo = (email) => {
    setForm(f => ({ ...f, email, password: 'password123' }));
    setError('');
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

            {/* ─── Google OAuth Button ─── */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-color)', opacity: 0.3 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or continue with</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-color)', opacity: 0.3 }} />
              </div>
              <button
                id="google-login-btn"
                type="button"
                className="btn-google"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="google-spinner" />
                    Connecting to Google...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <GoogleIcon />
                    Continue with Google
                  </span>
                )}
              </button>
            </div>

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
