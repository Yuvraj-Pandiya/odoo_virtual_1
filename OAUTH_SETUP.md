# 🔐 TransitOps — Google OAuth2 Feature Setup Guide

This guide walks you through getting Google OAuth2 working in TransitOps — from zero to a fully functional "Continue with Google" button.

---

## 📋 Table of Contents

1. [How OAuth2 Works in TransitOps](#how-oauth2-works)
2. [Step 1: Create a Google Cloud Project](#step-1-google-cloud-console)
3. [Step 2: Enable the Google People API](#step-2-enable-api)
4. [Step 3: Create OAuth2 Credentials](#step-3-create-credentials)
5. [Step 4: Add Authorized Redirect URIs](#step-4-redirect-uris)
6. [Step 5: Copy Client ID and Client Secret](#step-5-copy-credentials)
7. [Step 6: Configure .env File](#step-6-env-file)
8. [Step 7: Run the Database Migration](#step-7-database-migration)
9. [Step 8: Restart the Backend](#step-8-restart)
10. [Step 9: Test the Flow](#step-9-test)
11. [Authentication Flow Diagram](#flow-diagram)
12. [User Cases Explained](#user-cases)
13. [Common Debugging Issues](#debugging)
14. [Security Notes](#security)
15. [Going to Production](#production)

---

## How OAuth2 Works in TransitOps <a name="how-oauth2-works"></a>

Google OAuth2 in TransitOps is a **browser redirect flow** — NOT a popup. Here's the high-level:

```
User clicks "Continue with Google"
       ↓
Browser redirects to http://localhost:5000/api/auth/google
       ↓
Passport redirects to Google's consent screen
       ↓
User selects Google account and grants permission
       ↓
Google calls: http://localhost:5000/api/auth/google/callback?code=...
       ↓
Passport strategy runs (passport.js) → DB lookup → 3 cases handled
       ↓
Backend generates JWT (same as local login)
       ↓
Backend redirects browser to: http://localhost:5173/auth/callback?token=JWT&user=...
       ↓
React OAuthCallback.jsx reads token → saves to localStorage → navigate(/dashboard)
       ↓
User is now logged in with the same JWT middleware protecting all APIs
```

The JWT produced is **identical** to a local login JWT — same payload `{ id, email, role }`, same secret, same expiry. Existing RBAC middleware works with no changes.

---

## Step 1: Create a Google Cloud Project <a name="step-1-google-cloud-console"></a>

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Sign in with your Google account.
3. At the top, click the **project dropdown** (next to "Google Cloud" logo).
4. Click **"New Project"**.
5. Set:
   - **Project name:** `TransitOps`  (or any name you like)
   - **Location:** Leave as "No organization" for personal projects
6. Click **"Create"**.
7. Wait ~10 seconds, then select the new project from the dropdown.

---

## Step 2: Enable the Google People API <a name="step-2-enable-api"></a>

The People API provides profile name and photo. The OAuth2 flow needs it.

1. In the left sidebar, click **"APIs & Services"** → **"Library"**.
2. Search for **"Google People API"**.
3. Click on it → click **"Enable"**.

> **Note:** You may also want to enable **"Google+ API"** — although deprecated, some older passport versions use it. `passport-google-oauth20` uses the People API, so just the People API is sufficient.

---

## Step 3: Create OAuth2 Credentials <a name="step-3-create-credentials"></a>

1. In the left sidebar, click **"APIs & Services"** → **"Credentials"**.
2. Click **"+ Create Credentials"** → **"OAuth client ID"**.
3. If prompted to configure the **OAuth consent screen** first:
   - Choose **"External"** (for testing with any Google account).
   - Fill in:
     - **App name:** `TransitOps`
     - **User support email:** your email
     - **Developer contact email:** your email
   - Click **"Save and Continue"** through all steps.
   - On the **"Test users"** screen, add your own Google email if the app is in "Testing" mode.
   - Click **"Back to Dashboard"**.
4. Now go back to **Credentials** → **"+ Create Credentials"** → **"OAuth client ID"**.
5. Choose **Application type:** `Web application`.
6. Set **Name:** `TransitOps Development`.

---

## Step 4: Add Authorized Redirect URIs <a name="step-4-redirect-uris"></a>

This is the **most critical step**. Google will only redirect to URIs you explicitly authorize.

### Authorized JavaScript Origins (for development):
```
http://localhost:5173
http://localhost:5000
```

### Authorized Redirect URIs (for development):
```
http://localhost:5000/api/auth/google/callback
```

> ⚠️ **Must match exactly** — no trailing slashes, correct port numbers.
> If you see `redirect_uri_mismatch` errors, this is where to look.

Click **"Create"**.

---

## Step 5: Copy Client ID and Client Secret <a name="step-5-copy-credentials"></a>

After clicking "Create", a dialog appears with:

```
Your Client ID:     XXXXXXXXXX.apps.googleusercontent.com
Your Client Secret: GOCSPX-XXXXXXXXXXXXXXXXXXXX
```

**Copy both values** — you'll need them in the next step.

> 💡 You can always return to **APIs & Services → Credentials** to view them again.

---

## Step 6: Configure the .env File <a name="step-6-env-file"></a>

Open `backend/.env` and replace the placeholder values:

```env
# ─── Google OAuth2 ────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YourActualSecretHere
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL (used to redirect after OAuth2 completes)
FRONTEND_URL=http://localhost:5173

# Session secret (for OAuth2 state parameter)
SESSION_SECRET=pick_a_long_random_string_here_for_security
```

**Replace:**
- `123456789-abcdefghijklmnop.apps.googleusercontent.com` → your actual Client ID
- `GOCSPX-YourActualSecretHere` → your actual Client Secret

> ⚠️ **Never commit `.env` to Git.** It's already in `.gitignore`.

---

## Step 7: Run the Database Migration <a name="step-7-database-migration"></a>

This adds 3 new columns to the `users` table:
- `provider` — `'local'` or `'google'`
- `google_id` — Google's unique user ID
- `profile_picture` — Google profile photo URL

It also relaxes the `password_hash NOT NULL` constraint (Google users have no password).

```bash
cd backend
npm run oauth-migrate
```

Expected output:
```
🔄 Running OAuth2 migration...
  ✅ Column 'provider' added (default: 'local')
  ✅ Column 'google_id' added
  ✅ Column 'profile_picture' added
  ✅ 'password_hash' constraint relaxed to allow NULL
  ✅ Index on 'google_id' created
  ✅ Index on 'provider' created

✅ OAuth2 migration completed successfully!
   Existing users: provider = "local", google_id = NULL
   New Google users will have: provider = "google"
```

> 💡 **Safe to run multiple times** — uses `IF NOT EXISTS` and `IF NOT EXISTS` column checks.

---

## Step 8: Restart the Backend <a name="step-8-restart"></a>

```bash
# In the backend directory
npm run dev
```

You should see:
```
🚀 TransitOps API running on http://localhost:5000
✅ Connected to PostgreSQL | Environment: development
🔐 Google OAuth2 enabled | Callback: http://localhost:5000/api/auth/google/callback
```

If you see `⚠️ Google OAuth2 not configured` — double-check that `.env` has the correct `GOOGLE_CLIENT_ID`.

---

## Step 9: Test the Flow <a name="step-9-test"></a>

### Test 1: Successful Google Login
1. Open `http://localhost:5173/login`.
2. Click **"Continue with Google"**.
3. Google consent screen should appear.
4. Select your Google account.
5. You should be redirected to `/dashboard`.
6. Open browser DevTools → Application → LocalStorage — you should see `transitops_token` and `transitops_user`.

### Test 2: Rejected Local Account
1. Register a local account with `yourname@gmail.com` using email/password.
2. Try logging in with "Continue with Google" using the same Gmail.
3. You should see: _"This email is already registered using email and password. Please sign in using your existing credentials."_

### Test 3: Persistent Login
1. Log in with Google.
2. Close the browser tab.
3. Open `http://localhost:5173/` — you should go directly to `/dashboard`.

### Test 4: Logout
1. Click logout in the sidebar.
2. Token should be cleared from localStorage.
3. Redirected to `/login`.

---

## Authentication Flow Diagram <a name="flow-diagram"></a>

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                             │
│                                                                 │
│  Login.jsx                                                      │
│  ┌────────────────────────────────┐                            │
│  │  [Continue with Google] button │                            │
│  │  onClick → window.location.href│                            │
│  │  = localhost:5000/api/auth/google                           │
│  └────────────────────┬───────────┘                            │
│                        │ Browser redirect                        │
└────────────────────────┼────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      BACKEND (Node.js)                           │
│                                                                 │
│  GET /api/auth/google                                           │
│  passport.authenticate('google', { scope: ['profile', 'email'] │
│  → Redirects browser to Google                                  │
│                        │                                        │
│  ◄─────────────────────┘ Google callback with ?code=...         │
│                                                                 │
│  GET /api/auth/google/callback                                  │
│  passport.authenticate → googleVerifyCallback()                 │
│                                                                 │
│  DB Lookup:                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  google_id exists?  → Case A: Login → generateToken()   │  │
│  │  email exists (local)?→Case B: Reject → redirect error  │  │
│  │  Neither?           → Case C: Create user → generateToken│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  generateToken({ id, email, role })  ← SAME as local login     │
│                                                                 │
│  res.redirect(FRONTEND_URL/auth/callback?token=JWT&user=B64)   │
└────────────────────────┬────────────────────────────────────────┘
                         │ Browser redirect
┌────────────────────────▼────────────────────────────────────────┐
│                     FRONTEND (React)                             │
│                                                                 │
│  OAuthCallback.jsx (/auth/callback)                             │
│  1. Read ?token and ?user from URL                             │
│  2. Decode base64 user JSON                                     │
│  3. loginWithToken(token, user) → AuthContext                   │
│  4. localStorage.setItem('transitops_token', token)             │
│  5. navigate('/dashboard', { replace: true })                   │
│                                                                 │
│  All future API calls → axios interceptor adds Bearer token     │
│  JWT middleware validates → req.user set → RBAC works           │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Cases Explained <a name="user-cases"></a>

| Scenario | Condition | Result |
|---|---|---|
| **New user** | No account with this email | Auto-created with `role=fleet_manager`, `provider=google` |
| **Returning Google user** | `google_id` matches | Logged in, JWT generated |
| **Local account conflict** | Email exists, `provider=local` | **Rejected** with helpful error message |
| **Disabled Google account** | `is_active = false` | Rejected with "Account disabled" message |

---

## Common Debugging Issues <a name="debugging"></a>

### ❌ `redirect_uri_mismatch`
**Cause:** The callback URL in Google Console doesn't match `GOOGLE_CALLBACK_URL` in `.env`.

**Fix:** In Google Console → Credentials → Your OAuth client → Add exactly:
```
http://localhost:5000/api/auth/google/callback
```
(No trailing slash, port must match)

---

### ❌ `Error: GOOGLE_CLIENT_ID is not set`
**Cause:** Environment variable not loaded.

**Fix:**
1. Check `.env` file exists in the `backend/` folder.
2. Restart the backend server — env vars are loaded at startup.
3. Verify there are no typos: `GOOGLE_CLIENT_ID=` (no spaces around `=`).

---

### ❌ Google consent screen shows `Error 403: access_denied`
**Cause:** Your Google account is not in the "Test users" list (if app is in Testing mode).

**Fix:** In Google Console → OAuth consent screen → "Test users" → Add your Gmail address.

---

### ❌ `Cannot GET /api/auth/google`
**Cause:** Passport not initialized or routes not loaded.

**Fix:** Check that `backend/src/index.js` has:
```js
const passport = require('passport');
require('./config/passport');
app.use(passport.initialize());
```
And that the backend restarted after changes.

---

### ❌ `/auth/callback` shows blank page or loops
**Cause:** `OAuthCallback.jsx` not imported or route not added to `App.jsx`.

**Fix:** Check that `App.jsx` has:
```jsx
import OAuthCallback from './pages/OAuthCallback';
// ...
<Route path="/auth/callback" element={<OAuthCallback />} />
```

---

### ❌ `column "provider" does not exist`
**Cause:** OAuth migration hasn't been run.

**Fix:**
```bash
cd backend
npm run oauth-migrate
```

---

### ❌ Google button appears but clicking does nothing
**Cause:** Backend not running or CORS blocking the redirect.

**Fix:**
1. Make sure backend is running on port 5000: `npm run dev`
2. Check browser console for CORS errors.
3. Verify `FRONTEND_URL=http://localhost:5173` in `.env`.

---

### ❌ After login, stays on callback page (no redirect)
**Cause:** `loginWithToken` not exported from `AuthContext`.

**Fix:** Verify `AuthContext.jsx` exports `loginWithToken` in the context value:
```jsx
<AuthContext.Provider value={{ user, login, loginWithToken, logout, hasRole, isAuthenticated: !!user }}>
```

---

## Security Notes <a name="security"></a>

### What We're Doing Right ✅
- **Provider separation** — `provider` column prevents a Google user from taking over a local account and vice versa.
- **google_id as canonical ID** — More reliable than email (emails can change).
- **Same JWT pipeline** — Google users use identical JWT middleware, no separate auth paths.
- **Session lifetime** — Session cookie for OAuth state validation lasts only 5 minutes.
- **CORS whitelist** — Only `localhost:5173` and `localhost:5174` are allowed.
- **Helmet** — Security headers set on all responses.
- **Rate limiting** — 200 requests per 15 minutes.

### Known Trade-offs ⚠️
- **Token in URL** — The JWT appears briefly in the browser's address bar during the OAuth callback redirect. This is the standard "redirect with token" pattern. The URL is replaced immediately by `navigate('/dashboard', { replace: true })`.
- **localStorage vs HttpOnly Cookie** — localStorage is vulnerable to XSS. For a production system handling sensitive fleet data, consider migrating to HttpOnly cookies. The OAuth flow would need to set a cookie instead of putting the token in the URL.

---

## Going to Production <a name="production"></a>

When deploying to production, update these settings:

### Google Console
Add your production domain to:
- **Authorized JavaScript origins:** `https://yourdomain.com`
- **Authorized redirect URIs:** `https://yourdomain.com/api/auth/google/callback`

### Backend .env
```env
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
FRONTEND_URL=https://your-frontend.com
SESSION_SECRET=use_a_64_char_random_string_generated_securely
NODE_ENV=production
```

### Session Cookie
In production, `NODE_ENV=production` automatically sets `secure: true` on the session cookie (HTTPS only).

### OAuth Consent Screen
Change from "Testing" to "Production" mode in Google Console to allow any Google user to sign in (not just test users).

---

## Files Modified/Created

| File | Type | Change |
|---|---|---|
| `backend/src/config/oauthMigrate.js` | NEW | DB migration — adds provider, google_id, profile_picture |
| `backend/src/config/passport.js` | NEW | Google OAuth2 strategy with 3 user cases |
| `backend/src/controllers/authController.js` | MODIFIED | Added `googleCallback` handler |
| `backend/src/routes/auth.js` | MODIFIED | Added `/google` and `/google/callback` routes |
| `backend/src/index.js` | MODIFIED | Added session, passport, improved CORS |
| `backend/.env` | MODIFIED | Added Google OAuth2 env vars |
| `backend/.env.example` | MODIFIED | Documented new env vars |
| `backend/package.json` | MODIFIED | Added `oauth-migrate` script |
| `frontend/src/context/AuthContext.jsx` | MODIFIED | Added `loginWithToken()` |
| `frontend/src/pages/Login.jsx` | MODIFIED | Added Google button + error URL param handling |
| `frontend/src/pages/OAuthCallback.jsx` | NEW | Callback page — saves JWT, redirects to dashboard |
| `frontend/src/App.jsx` | MODIFIED | Added `/auth/callback` route |
| `frontend/src/index.css` | MODIFIED | Added `.btn-google` + `.google-spinner` styles |
| `OAUTH_SETUP.md` | NEW | This file |

---

*TransitOps — Smart Transport Operations Platform*
*OAuth2 implementation by Antigravity AI | Odoo Hackathon 2026*
