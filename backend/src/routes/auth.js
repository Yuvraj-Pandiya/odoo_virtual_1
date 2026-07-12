/**
 * routes/auth.js
 * ---------------
 * WHY MODIFIED: Added two new Google OAuth2 routes at the bottom.
 *               All existing routes (login, register, me, users, etc.) are completely unchanged.
 *
 * NEW ROUTES:
 *   GET /api/auth/google
 *     — Initiates OAuth2 flow. Browser is redirected to Google's consent screen.
 *       No request body needed. Not an API call — it's a full browser redirect.
 *
 *   GET /api/auth/google/callback
 *     — Google redirects here after user consents (or denies).
 *       passport.authenticate with failureRedirect handles Passport errors.
 *       On success, googleCallback() is called, which generates a JWT and
 *       redirects the browser to the React /auth/callback page.
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const {
  login, register, getMe, getUsers,
  updateUserRole, updateUserStatus, updateProfile, changePassword,
  googleCallback,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// ─── Existing Local Auth Routes (UNCHANGED) ─────────────────────────────────
router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticate, getMe);

// Settings and RBAC management
router.get('/users', authenticate, authorize('fleet_manager'), getUsers);
router.put('/users/:id/role', authenticate, authorize('fleet_manager'), updateUserRole);
router.put('/users/:id/status', authenticate, authorize('fleet_manager'), updateUserStatus);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

// ─── Google OAuth2 Routes (NEW) ─────────────────────────────────────────────

/**
 * GET /api/auth/google
 * Triggers the OAuth2 flow — Passport redirects browser to Google consent screen.
 * scope: 'profile' gives us name + photo, 'email' gives us the email address.
 */
router.get('/google',
  (req, res, next) => {
    // Store the requested role in the session so we can retrieve it after Google redirects back
    req.session.oauthRole = req.query.role || 'fleet_manager';
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account', // Always show account picker (even if already signed in)
  })
);

/**
 * GET /api/auth/google/callback
 * Google redirects here after consent.
 * - On failure: redirect to login with a generic error
 * - On success: call googleCallback() which generates JWT and redirects to React
 *
 * `passReqToCallback: true` is set in passport config so req.authInfo carries
 * the rejection message from the strategy's done(null, false, { message }) call.
 */
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent('Internal server error during authentication.')}`);
    }
    if (!user) {
      // info.message contains the custom message from our strategy's done(null, false, { message: ... })
      const errorMessage = info?.message || 'Authentication failed.';
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(errorMessage)}`);
    }
    
    // Success — attach user to req and proceed to the googleCallback controller
    req.user = user;
    next();
  })(req, res, next);
}, googleCallback);

module.exports = router;
