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

  /**
   * handleGoogleLogin
   * WHY: Google OAuth2 is a browser-redirect flow — NOT an axios/fetch call.
   *      We redirect the full browser window to the backend Google auth route.
   *      Passport handles the redirect to Google, Google calls back to backend,
   *      backend generates JWT and redirects to /auth/callback (OAuthCallback.jsx).
   */
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError('');
    // Full page redirect — intentional (OAuth2 requires browser redirect)
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'url(/img/carousel-1.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 0 }} />

      <div className="logistica-card" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: mode === 'register' ? '460px' : '420px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--logistica-primary)', color: 'white', marginBottom: 16 }}>
             <Zap size={32} />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>Logistica</h2>
          <p style={{ color: 'var(--text-muted)' }}>Smart Transport Operations Platform</p>
        </div>

        {mode === 'login' ? (
          <>
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="logistica-input"
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
                    className="logistica-input"
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
                <div className="logistica-alert logistica-alert-danger">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}

              <button id="login-submit-btn" type="submit" className="btn-logistica" style={{ width: '100%', padding: '14px', fontSize: 16 }} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* ─── Google OAuth Button ─── */}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>or continue with</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
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
                  className="logistica-input"
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
                  className="logistica-input"
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
                    className="logistica-input"
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
                <div className="logistica-alert logistica-alert-danger">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}

              <button id="register-submit-btn" type="submit" className="btn-logistica" style={{ width: '100%', padding: '14px', fontSize: 16 }} disabled={loading}>
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
