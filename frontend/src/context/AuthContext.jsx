/**
 * AuthContext.jsx
 * ----------------
 * WHY MODIFIED:
 *   Added `loginWithToken(token, user)` — a new method used exclusively by the
 *   OAuthCallback page after Google OAuth2 completes.
 *
 *   The OAuth2 flow cannot use the existing `login(email, password)` function
 *   because we don't have the user's password — we only receive the JWT and
 *   user object from the backend redirect. This function bridges that gap while
 *   keeping all auth state management in one place (AuthContext).
 *
 * UNCHANGED:
 *   - login(email, password) — local login, works exactly as before
 *   - logout()               — clears localStorage, works exactly as before
 *   - hasRole()              — RBAC helper, works exactly as before
 *   - isAuthenticated        — derived from user state, unchanged
 *
 * STORAGE DECISION (localStorage):
 *   Consistent with existing local login. The token is stored under the same
 *   key `transitops_token` so the axios interceptor picks it up automatically
 *   for both local and Google-authenticated users — no changes needed to api/client.js.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('transitops_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // ─── Local Email/Password Login (UNCHANGED) ──────────────────────────────
  const login = useCallback(async (email, password, role) => {
    const { data } = await api.post('/auth/login', { email, password, role });
    localStorage.setItem('transitops_token', data.token);
    localStorage.setItem('transitops_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  // ─── Google OAuth Token Login (NEW) ──────────────────────────────────────
  /**
   * loginWithToken — called by OAuthCallback.jsx after Google OAuth2 redirect.
   * WHY: We already have the token + user from the backend redirect URL params.
   *      We just need to save them to localStorage and update React state.
   *      The axios interceptor will automatically use the token for subsequent requests.
   */
  const loginWithToken = useCallback((token, userData) => {
    localStorage.setItem('transitops_token', token);
    localStorage.setItem('transitops_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  // ─── Logout (UNCHANGED) ──────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('transitops_token');
    localStorage.removeItem('transitops_user');
    setUser(null);
  }, []);

  // ─── RBAC Helper (UNCHANGED) ─────────────────────────────────────────────
  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, loginWithToken, logout, hasRole, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
