/**
 * src/index.js — Express Application Entry Point
 * -------------------------------------------------
 * CHANGES FOR OAUTH2:
 *   1. Added `express-session` — Required by Passport internally for the OAuth2
 *      redirect dance (state parameter validation). Even though we use JWT and
 *      `session: false` on the callback route, Passport still needs session middleware
 *      to be present during the initial /google redirect.
 *
 *   2. Added `passport.initialize()` — Registers Passport as Express middleware.
 *
 *   3. Added `require('./config/passport')` — Loads and registers the Google strategy.
 *      Must be required AFTER dotenv.config() so env vars are available.
 *
 *   4. Updated CORS — Added explicit `origin` with FRONTEND_URL env var for production
 *      safety, while keeping `origin: true` as fallback for development.
 *
 * Everything else is UNCHANGED.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('passport');

// Load Google OAuth2 strategy — must come after dotenv.config()
require('./config/passport');

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const driverRoutes = require('./routes/drivers');
const tripRoutes = require('./routes/trips');
const maintenanceRoutes = require('./routes/maintenance');
const fuelRoutes = require('./routes/fuel');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());

// CORS: Allow frontend origin + credentials for OAuth2 cookie-based redirect
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
}));

// ─── Session Middleware ──────────────────────────────────────────────────────
// WHY: Passport's OAuth2 flow requires session to store the `state` parameter
//      during the Google redirect. We use `session: false` on the actual callback
//      route so no user data is stored in the session beyond the OAuth handshake.
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'transitops-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 5 * 60 * 1000, // 5 minutes — only needed for the OAuth redirect dance
    sameSite: 'lax',
  },
}));

// ─── Passport Initialization ─────────────────────────────────────────────────
app.use(passport.initialize());
// Note: We do NOT call app.use(passport.session()) because we use JWT, not sessions

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TransitOps API is running',
    timestamp: new Date().toISOString(),
    oauth: !!process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not configured',
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api', fuelRoutes);
app.use('/api/reports', reportRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 TransitOps API running on http://localhost:${PORT}`);
  console.log(`✅ Connected to PostgreSQL | Environment: ${process.env.NODE_ENV}`);
  if (process.env.GOOGLE_CLIENT_ID) {
    console.log(`🔐 Google OAuth2 enabled | Callback: ${process.env.GOOGLE_CALLBACK_URL}`);
  } else {
    console.log(`⚠️  Google OAuth2 not configured — add GOOGLE_CLIENT_ID to .env`);
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} already in use! Kill node with:\n   taskkill /IM node.exe /F\n`);
    process.exit(1);
  }
});

module.exports = app;
