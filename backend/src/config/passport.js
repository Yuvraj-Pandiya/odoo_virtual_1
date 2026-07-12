/**
 * passport.js — Google OAuth2 Strategy
 * ----------------------------------------
 * WHY: Passport.js is the industry-standard authentication middleware for Node.js.
 *      `passport-google-oauth20` handles the OAuth2 PKCE handshake with Google,
 *      so we only need to write the database logic for what happens after authentication.
 *
 * HOW IT WORKS:
 *   1. Google calls our callback with the user's profile after they consent.
 *   2. We check the DB for 3 cases:
 *      Case A — google_id exists          → returning Google user, log in
 *      Case B — email exists, provider=local → reject (prevent account spoofing)
 *      Case C — email not found           → auto-create new account (role: fleet_manager)
 *   3. We call done(null, user) — Passport attaches user to req.user.
 *   4. The controller then generates a JWT (same generateToken() as local login).
 *
 * SECURITY:
 *   - We trust Google's ID token — email_verified is implicitly true for OAuth2.
 *   - google_id is the canonical identifier (email can theoretically change).
 *   - provider field prevents hijacking a local account via Google OAuth.
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./db');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      // Request minimal scopes — only what we need
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase().trim();
        const name = profile.displayName || profile.name?.givenName || 'Google User';
        const profilePicture = profile.photos?.[0]?.value || null;

        if (!email) {
          return done(null, false, { message: 'No email returned from Google. Please ensure your Google account has a public email.' });
        }

        // ─────────────────────────────────────────────
        // CASE A: Returning Google user (google_id match)
        // ─────────────────────────────────────────────
        const existingByGoogleId = await query(
          'SELECT id, name, email, role, is_active, provider, profile_picture FROM users WHERE google_id = $1',
          [googleId]
        );

        if (existingByGoogleId.rows.length > 0) {
          const user = existingByGoogleId.rows[0];

          if (!user.is_active) {
            return done(null, false, { message: 'Account is disabled. Contact admin.' });
          }

          // Optionally update profile picture if it changed
          if (profilePicture && user.profile_picture !== profilePicture) {
            await query('UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE id = $2', [profilePicture, user.id]);
            user.profile_picture = profilePicture;
          }

          console.log(`✅ Google OAuth: Returning user logged in — ${email}`);
          return done(null, user);
        }

        // ─────────────────────────────────────────────
        // CASE B: Email exists but provider = 'local'
        // ─────────────────────────────────────────────
        const existingByEmail = await query(
          'SELECT id, provider FROM users WHERE email = $1',
          [email]
        );

        if (existingByEmail.rows.length > 0) {
          const existingUser = existingByEmail.rows[0];

          if (existingUser.provider === 'local' || existingUser.provider === null) {
            // Reject — do not allow Google to hijack a local account
            return done(null, false, {
              message: 'This email is already registered using email and password. Please sign in using your existing credentials.',
            });
          }
        }

        // ─────────────────────────────────────────────
        // CASE C: New user — auto-register
        // ─────────────────────────────────────────────
        const newUserResult = await query(
          `INSERT INTO users
            (name, email, password_hash, role, provider, google_id, profile_picture, is_active)
           VALUES ($1, $2, NULL, 'fleet_manager', 'google', $3, $4, TRUE)
           RETURNING id, name, email, role, provider, google_id, profile_picture, is_active`,
          [name, email, googleId, profilePicture]
        );

        const newUser = newUserResult.rows[0];
        console.log(`✅ Google OAuth: New user registered — ${email} (role: fleet_manager)`);
        return done(null, newUser);

      } catch (err) {
        console.error('❌ Google OAuth strategy error:', err);
        return done(err, null);
      }
    }
  )
);

// Passport serialize/deserialize — only needed for session (we use JWT, not sessions)
// We still need these stubs because passport.initialize() expects them
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, { id }));

module.exports = passport;
