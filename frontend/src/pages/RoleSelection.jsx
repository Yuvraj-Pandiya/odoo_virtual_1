/**
 * RoleSelection.jsx — Google OAuth2 Role Picker
 * ------------------------------------------------
 * WHY THIS PAGE EXISTS:
 *   When a brand-new user signs in with Google, we don't know their role.
 *   The backend generates a 10-minute "pending" JWT (containing their Google
 *   profile) and redirects here. This page shows their Google profile and 4
 *   role cards. When they click a role, we POST to /api/auth/google/complete-signup
 *   which verifies the pending token, creates the account, and returns a real JWT.
 *
 * URL: /auth/select-role?pending=PENDING_JWT
 *
 * ONLY shown to brand-new Google users. Returning users go directly to /dashboard.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

// Role definitions with icons, descriptions and accent colors
const ROLES = [
  {
    value: 'fleet_manager',
    label: 'Fleet Manager',
    emoji: '🚛',
    description: 'Manage vehicles, dispatch trips, and oversee operations.',
    color: '#FF3E41',
    border: 'rgba(255, 62, 65, 0.3)',
    bg: 'rgba(255, 62, 65, 0.08)',
  },
  {
    value: 'driver',
    label: 'Driver',
    emoji: '🧑‍✈️',
    description: 'View assigned trips, log fuel, and update trip status.',
    color: '#51CFED',
    border: 'rgba(81, 207, 237, 0.3)',
    bg: 'rgba(81, 207, 237, 0.08)',
  },
  {
    value: 'safety_officer',
    label: 'Safety Officer',
    emoji: '🛡️',
    description: 'Monitor driver safety scores and compliance reports.',
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.3)',
    bg: 'rgba(16, 185, 129, 0.08)',
  },
  {
    value: 'financial_analyst',
    label: 'Financial Analyst',
    emoji: '📊',
    description: 'Review fuel costs, expenses, revenue, and analytics.',
    color: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.3)',
    bg: 'rgba(245, 158, 11, 0.08)',
  },
];

// Decode the pending JWT payload (just the payload, not signature — verification happens on server)
function decodePendingToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export default function RoleSelection() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [pendingToken] = useState(() => searchParams.get('pending'));
  const [profile, setProfile] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenExpired, setTokenExpired] = useState(false);

  // Decode the profile from the pending token to show the user's name + picture
  useEffect(() => {
    if (!pendingToken) {
      navigate('/login', { replace: true });
      return;
    }

    const decoded = decodePendingToken(pendingToken);
    if (!decoded || decoded.type !== 'pending_google_signup') {
      setError('Invalid or tampered session. Please start over.');
      return;
    }

    // Check if the token has already expired (client-side hint only, server enforces)
    if (decoded.exp && Date.now() / 1000 > decoded.exp) {
      setTokenExpired(true);
      return;
    }

    setProfile({
      name: decoded.name,
      email: decoded.email,
      picture: decoded.profilePicture,
    });
  }, [pendingToken, navigate]);

  const handleConfirm = async () => {
    if (!selectedRole) {
      setError('Please select a role to continue.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/google/complete-signup', {
        pending_token: pendingToken,
        role: selectedRole,
      });

      loginWithToken(data.token, data.user);

      toast.success(
        `Welcome to TransitOps, ${data.user.name?.split(' ')[0]}! Signed in as ${
          ROLES.find(r => r.value === data.user.role)?.label
        } 🎉`
      );

      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      if (err.response?.status === 401) {
        setTokenExpired(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Expired state ─────────────────────────────────────────────────────────
  if (tokenExpired) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <h2 style={{ color: 'var(--text-main)', marginBottom: 8, fontSize: 20 }}>Session Expired</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
            Your Google sign-in session expired (10 minute limit). Please start the process again.
          </p>
          <button
            onClick={() => { window.location.href = 'http://localhost:5000/api/auth/google'; }}
            style={primaryBtnStyle}
          >
            Sign in with Google again
          </button>
        </div>
      </div>
    );
  }

  // ── Hard error state ───────────────────────────────────────────────────────
  if (error && !profile) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: 'var(--text-main)', marginBottom: 8, fontSize: 20 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{error}</p>
          <button onClick={() => navigate('/login')} style={primaryBtnStyle}>Back to Login</button>
        </div>
      </div>
    );
  }

  // ── Loading profile state ─────────────────────────────────────────────────
  if (!profile) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // ── Main role selection UI ─────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: 560 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {/* Logistica brand mark */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--logistica-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 4px 20px rgba(255, 62, 65, 0.4)',
          }}>
            <span style={{ fontSize: 22, color: '#fff' }}>⚡</span>
          </div>

          <h1 style={{
            fontSize: 22, fontWeight: 700,
            color: 'var(--text-main)', margin: '0 0 4px',
          }}>
            Choose Your Role
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            One last step — select how you'll use TransitOps
          </p>
        </div>

        {/* Google profile card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-color)',
          borderRadius: 12, marginBottom: 24,
        }}>
          {profile.picture ? (
            <img
              src={profile.picture}
              alt={profile.name}
              style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--logistica-primary)' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--logistica-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#fff', fontWeight: 700,
            }}>
              {profile.name?.[0]?.toUpperCase() || 'G'}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-main)' }}>
              {profile.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {profile.email}
            </div>
          </div>
          <div style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 600,
            color: '#34A853',
            background: 'rgba(52, 168, 83, 0.12)',
            padding: '3px 10px', borderRadius: 20,
          }}>
            ✓ Google Verified
          </div>
        </div>

        {/* Role cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.value;
            return (
              <button
                key={role.value}
                id={`role-${role.value}`}
                type="button"
                onClick={() => { setSelectedRole(role.value); setError(''); }}
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? role.color : role.border}`,
                  background: isSelected ? role.bg : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelected ? `0 4px 20px ${role.color}30` : 'none',
                  outline: 'none',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = role.color;
                    e.currentTarget.style.background = role.bg;
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = role.border;
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 8 }}>{role.emoji}</div>
                <div style={{
                  fontSize: 13, fontWeight: 700,
                  color: isSelected ? role.color : 'var(--text-main)',
                  marginBottom: 5,
                }}>
                  {role.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {role.description}
                </div>
                {isSelected && (
                  <div style={{
                    marginTop: 8, fontSize: 11, fontWeight: 700,
                    color: role.color,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    ✓ Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '10px 14px',
            background: 'rgba(255, 62, 65, 0.1)',
            border: '1px solid rgba(255, 62, 65, 0.3)',
            borderRadius: 8, marginBottom: 16,
            fontSize: 13, color: '#ff6b6b',
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* Confirm button */}
        <button
          id="confirm-role-btn"
          type="button"
          onClick={handleConfirm}
          disabled={!selectedRole || loading}
          style={{
            ...primaryBtnStyle,
            opacity: (!selectedRole || loading) ? 0.5 : 1,
            cursor: (!selectedRole || loading) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Creating account...' : selectedRole
            ? `Join as ${ROLES.find(r => r.value === selectedRole)?.label} →`
            : 'Select a role to continue'}
        </button>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 12,
              cursor: 'pointer', padding: 4,
            }}
          >
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared inline styles ───────────────────────────────────────────────────────
const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
  background: 'var(--bg-main)',
};

const cardStyle = {
  width: '100%',
  maxWidth: 520,
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 20,
  padding: '32px 28px',
  boxShadow: 'var(--card-shadow)',
};

const primaryBtnStyle = {
  width: '100%',
  padding: '13px 20px',
  background: 'var(--logistica-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background 150ms ease, transform 150ms ease',
  fontFamily: 'inherit',
};
