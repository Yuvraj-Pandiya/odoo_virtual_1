const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * generateToken — shared JWT factory
 * WHY: Used by BOTH local login AND Google OAuth callback.
 *      Produces identical payload so all JWT middleware works the same for both auth methods.
 * PAYLOAD: { id, email, role } — matches what middleware/auth.js decodes.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is disabled. Contact admin.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const validRoles = ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'];
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name.trim(), email.toLowerCase().trim(), passwordHash, role]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/auth/users
const getUsers = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/auth/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
    }

    const result = await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'User role updated successfully.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/auth/users/:id/status
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ success: false, message: 'is_active status is required.' });
    }

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, is_active',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'User status updated successfully.', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    // Check email uniqueness
    const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.toLowerCase().trim(), req.user.id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email is already taken.' });
    }

    const result = await query(
      'UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, email, role',
      [name.trim(), email.toLowerCase().trim(), req.user.id]
    );

    res.json({ success: true, message: 'Profile updated successfully.', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Incorrect current password.' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * GET /api/auth/google/callback — Google OAuth2 callback handler
 * ---------------------------------------------------------------
 * TWO PATHS based on what Passport returned:
 *
 * PATH 1 — Existing Google user (Case A):
 *   req.user = { id, name, email, role, ... } — a real DB user
 *   → Generate JWT → redirect to /auth/callback (OAuthCallback.jsx)
 *
 * PATH 2 — New user needs role selection (Case C):
 *   req.user = { needsRoleSelection: true, googleProfile: {...} }
 *   → Generate a SHORT-LIVED 'pending' JWT (10 min, type='pending_google_signup')
 *   → Redirect to /auth/select-role?pending=PENDING_JWT
 *   → React shows role picker → user submits role
 *   → POST /api/auth/google/complete-signup creates the real account
 *
 * PATH 3 — Passport rejected (Case B / disabled):
 *   req.user = undefined → redirect to /login?error=...
 */
const googleCallback = (req, res) => {
  try {
    if (!req.user) {
      const message = encodeURIComponent(
        req.authInfo?.message || 'Google authentication failed. Please try again.'
      );
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=${message}`);
    }

    // PATH 2: New user — needs to pick a role first
    if (req.user.needsRoleSelection) {
      const { googleId, email, name, profilePicture } = req.user.googleProfile;

      // Short-lived pending token — NOT a real auth token
      // Contains Google profile data so the complete-signup endpoint
      // doesn't need a session to remember who the user is
      const pendingToken = jwt.sign(
        {
          type: 'pending_google_signup', // distinguishes from real JWT
          googleId,
          email,
          name,
          profilePicture,
        },
        process.env.JWT_SECRET,
        { expiresIn: '10m' } // expires in 10 minutes — short on purpose
      );

      console.log(`🔀 Google OAuth: Redirecting new user to role selection — ${email}`);
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/select-role?pending=${pendingToken}`
      );
    }

    // PATH 1: Existing returning Google user — generate real JWT
    const token = generateToken(req.user);
    const userPayload = Buffer.from(
      JSON.stringify({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        profile_picture: req.user.profile_picture || null,
      })
    ).toString('base64');

    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userPayload}`
    );
  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

/**
 * POST /api/auth/google/complete-signup
 * ----------------------------------------
 * WHY: Called by the RoleSelection.jsx page after the user picks their role.
 *      Verifies the pending token (proving Google did authenticate them),
 *      validates the chosen role, then creates the real account and returns a JWT.
 *
 * BODY: { pending_token: string, role: string }
 *
 * SECURITY:
 *   - Verifies JWT signature + expiry (10 min window)
 *   - Checks type === 'pending_google_signup' (can't use a real auth JWT here)
 *   - Re-checks email doesn't exist (prevents race conditions)
 *   - Role must be one of the 4 valid values
 */
const googleCompleteSignup = async (req, res) => {
  try {
    const { pending_token, role } = req.body;

    const validRoles = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'];
    if (!pending_token || !role) {
      return res.status(400).json({ success: false, message: 'pending_token and role are required.' });
    }
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role selected.' });
    }

    // Verify and decode the pending token
    let decoded;
    try {
      decoded = jwt.verify(pending_token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your session expired. Please sign in with Google again.',
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid session token.' });
    }

    // Guard: must be a pending signup token, not a regular user JWT
    if (decoded.type !== 'pending_google_signup') {
      return res.status(401).json({ success: false, message: 'Invalid token type.' });
    }

    const { googleId, email, name, profilePicture } = decoded;

    // Race condition check: user might have been created by another request
    const existing = await query(
      'SELECT id, provider FROM users WHERE email = $1 OR google_id = $2',
      [email, googleId]
    );
    if (existing.rows.length > 0) {
      const u = existing.rows[0];
      if (u.provider === 'local') {
        return res.status(409).json({
          success: false,
          message: 'This email is already registered with email/password. Please sign in normally.',
        });
      }
      // Already created (duplicate submit) — just return their JWT
      const existingUser = (await query(
        'SELECT id, name, email, role, profile_picture FROM users WHERE id = $1',
        [u.id]
      )).rows[0];
      const token = generateToken(existingUser);
      return res.json({
        success: true,
        message: 'Account already exists. Logging you in.',
        token,
        user: { id: existingUser.id, name: existingUser.name, email: existingUser.email, role: existingUser.role, profile_picture: existingUser.profile_picture },
      });
    }

    // Create the new Google user with the chosen role
    const result = await query(
      `INSERT INTO users
        (name, email, password_hash, role, provider, google_id, profile_picture, is_active)
       VALUES ($1, $2, NULL, $3, 'google', $4, $5, TRUE)
       RETURNING id, name, email, role, profile_picture`,
      [name, email, role, googleId, profilePicture]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser);

    console.log(`✅ Google OAuth: New user created — ${email} (role: ${role})`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profile_picture: newUser.profile_picture,
      },
    });
  } catch (err) {
    console.error('Google complete-signup error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { login, register, getMe, getUsers, updateUserRole, updateUserStatus, updateProfile, changePassword, googleCallback, googleCompleteSignup };
