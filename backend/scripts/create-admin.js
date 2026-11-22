// Creates a platform admin, or resets the password of an existing one.
//
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long-password' npm run create-admin
//
// The password is never stored in the repository. Use this instead of the old
// seeded admin account, and to rotate the admin password.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const fullName = process.env.ADMIN_NAME || 'Platform Admin';

  if (!email || !email.includes('@')) throw new Error('Set ADMIN_EMAIL');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');

  const hash = await bcrypt.hash(password, 12);
  const existing = await db.query('SELECT id, role FROM users WHERE email = $1', [email]);

  if (existing.rows.length) {
    if (existing.rows[0].role !== 'admin') {
      throw new Error(`${email} exists but is not an admin; refusing to change it`);
    }
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, existing.rows[0].id]);
    console.log(`Password updated for admin ${email}`);
  } else {
    await db.query(
      "INSERT INTO users (email, password_hash, role, full_name) VALUES ($1, $2, 'admin', $3)",
      [email, hash, fullName]
    );
    console.log(`Admin ${email} created`);
  }
}

main()
  .then(() => db.pool.end())
  .catch((err) => { console.error(err.message); db.pool.end(); process.exit(1); });
