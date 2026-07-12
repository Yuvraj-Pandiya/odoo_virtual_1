/**
 * passport.js — Google OAuth2 Strategy
 * ----------------------------------------
 * CHANGE IN CASE C:
 *   Previously: auto-created account with role='fleet_manager'
 *   Now: signals { needsRoleSelection: true, googleProfile: {...} }
 *        so the controller can redirect to the role-selection page.
 *
 *   WHY: Users should choose their own role (Fleet Manager, Driver, etc.)
 *        rather than having it hard-coded. This is critical for a multi-role
 *        fleet platform where the role determines what data you can see/edit.
 *
 * Cases A and B are UNCHANGED.
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./db');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
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

            console.log(`✅ Google OAuth: Returning user logged in — ${email} (role: ${user.role})`);
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
          // CASE C: New user — do NOT create yet.
          //         Signal role selection is needed.
          // ─────────────────────────────────────────────
          // We pass a special marker instead of a real user object.
          // The googleCallback controller will detect this and redirect
          // to the role-selection page with a short-lived pending token.
          console.log(`🔄 Google OAuth: New user — role selection required — ${email}`);
          return done(null, {
            needsRoleSelection: true,
            googleProfile: { googleId, email, name, profilePicture },
          });

        } catch (err) {
          console.error('❌ Google OAuth strategy error:', err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('⚠️  Google Client ID / Client Secret not found in .env. Google login option is disabled.');
}

// Passport serialize/deserialize stubs — required by passport.initialize()
// We use JWT not sessions, so these are minimal no-ops
passport.serializeUser((user, done) => done(null, user.id || 'pending'));
passport.deserializeUser((id, done) => done(null, { id }));

module.exports = passport;
