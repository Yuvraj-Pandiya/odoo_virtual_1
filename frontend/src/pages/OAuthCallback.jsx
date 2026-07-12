/**
 * OAuthCallback.jsx — Google OAuth2 Callback Handler
 * ----------------------------------------------------
 * WHY THIS PAGE EXISTS:
 *   Google OAuth2 is a browser-redirect flow. The backend generates a JWT and
 *   redirects to THIS page with the token in the URL query parameters:
 *     /auth/callback?token=JWT_HERE&user=BASE64_JSON_HERE
 *
 *   This page CANNOT be a popup or iframe — it must be a full page to receive
 *   the browser redirect from the backend.
 *
 * WHAT IT DOES:
 *   1. Read `?token` and `?user` params from the URL
 *   2. Decode the base64 user JSON
 *   3. Save token + user to localStorage via loginWithToken() from AuthContext
 *   4. Navigate to /dashboard (or show error if something went wrong)
 *
 * ERROR HANDLING:
 *   If the backend rejected the login (e.g., local account conflict),
 *   it redirects here as: /login?error=This email is already registered...
 *   The Login.jsx page handles that error parameter display.
 *
 * SECURITY NOTE:
 *   Tokens in URL query params can appear in server logs and browser history.
 *   This is a known trade-off of the "redirect with token" pattern used here
 *   for simplicity. In production, prefer PKCE with HttpOnly cookies.
 *   The token expires in 7 days, and this URL is only active for milliseconds.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get('token');
        const userEncoded = searchParams.get('user');
        const error = searchParams.get('error');

        // ── Error from backend ────────────────────────────────────────────────
        if (error) {
          setStatus('error');
          setErrorMessage(decodeURIComponent(error));
          // Redirect to login after showing the error briefly
          setTimeout(() => navigate(`/login?error=${encodeURIComponent(decodeURIComponent(error))}`, { replace: true }), 2500);
          return;
        }

        // ── Validate params ───────────────────────────────────────────────────
        if (!token || !userEncoded) {
          setStatus('error');
          setErrorMessage('Authentication failed — missing token. Please try again.');
          setTimeout(() => navigate('/login', { replace: true }), 2500);
          return;
        }

        // ── Decode user JSON from base64 ──────────────────────────────────────
        let userData;
        try {
          userData = JSON.parse(atob(userEncoded));
        } catch {
          setStatus('error');
          setErrorMessage('Authentication data is corrupted. Please try again.');
          setTimeout(() => navigate('/login', { replace: true }), 2500);
          return;
        }

        // ── Save to localStorage and update AuthContext ────────────────────────
        loginWithToken(token, userData);
        setStatus('success');

        // Clean URL params from browser history before redirecting
        toast.success(`Welcome to TransitOps, ${userData.name?.split(' ')[0] || 'User'}! 🎉`);
        setTimeout(() => navigate('/dashboard', { replace: true }), 800);

      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try signing in again.');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    processCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card" style={{ maxWidth: 400, textAlign: 'center' }}>

        {/* Brand mark */}
        <div className="login-logo" style={{ justifyContent: 'center', marginBottom: 32 }}>
          <div className="login-logo-icon">
            <Zap size={28} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="login-title">TransitOps</div>
            <div className="login-subtitle">Smart Transport Operations Platform</div>
          </div>
        </div>

        {/* Processing state */}
        {status === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', width: 64, height: 64 }}>
              <Loader2
                size={64}
                style={{
                  color: 'var(--primary)',
                  animation: 'spin 1s linear infinite',
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Completing Google Sign In...
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Setting up your account and generating access token.
              </p>
            </div>
          </div>
        )}

        {/* Success state */}
        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--success-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'fadeIn 0.3s ease',
            }}>
              <CheckCircle size={32} color="var(--success)" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Successfully Authenticated!
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Redirecting to dashboard...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--danger-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertCircle size={32} color="var(--danger)" />
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Authentication Failed
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {errorMessage}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Redirecting to sign in...
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
