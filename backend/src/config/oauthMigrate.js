/**
 * oauthMigrate.js
 * ----------------
 * WHY: The existing `users` table was designed for local email/password auth only.
 *      Google OAuth2 users have no password, but do have a google_id and profile picture.
 *      We need to:
 *        1. Add `provider` column  — tracks 'local' vs 'google' to prevent account spoofing
 *        2. Add `google_id` column — unique identifier from Google
 *        3. Add `profile_picture`  — store Google profile photo URL
 *        4. Relax `password_hash NOT NULL` — Google users have NULL passwords
 *
 * SAFETY: Uses `ADD COLUMN IF NOT EXISTS` and `ALTER COLUMN ... DROP NOT NULL`
 *         — safe to run multiple times, existing data is never touched.
 *
 * RUN: node src/config/oauthMigrate.js
 */

require('dotenv').config();
const { pool } = require('./db');

const runOAuthMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Running OAuth2 migration...');

    // 1. Add `provider` column — defaults to 'local' for all existing users
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'local' NOT NULL;
    `);
    console.log("  ✅ Column 'provider' added (default: 'local')");

    // 2. Add `google_id` column — NULL for local users, unique for Google users
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE;
    `);
    console.log("  ✅ Column 'google_id' added");

    // 3. Add `profile_picture` column — NULL for local users
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500);
    `);
    console.log("  ✅ Column 'profile_picture' added");

    // 4. Relax password_hash NOT NULL constraint so Google users (no password) are valid
    await client.query(`
      ALTER TABLE users
      ALTER COLUMN password_hash DROP NOT NULL;
    `);
    console.log("  ✅ 'password_hash' constraint relaxed to allow NULL");

    // 5. Add index on google_id for fast lookups during OAuth callback
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    `);
    console.log("  ✅ Index on 'google_id' created");

    // 6. Add index on provider for analytics/filtering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
    `);
    console.log("  ✅ Index on 'provider' created");

    await client.query('COMMIT');
    console.log('\n✅ OAuth2 migration completed successfully!');
    console.log('   Existing users: provider = "local", google_id = NULL');
    console.log('   New Google users will have: provider = "google"');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ OAuth migration failed:', err.message);

    // If columns already exist from a previous run, that's fine
    if (err.message.includes('already exists')) {
      console.log('ℹ️  Columns already exist — migration was already applied.');
    } else {
      throw err;
    }
  } finally {
    client.release();
    await pool.end();
  }
};

runOAuthMigration().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
