// Minimal SQL migration runner.
//   npm run migrate          apply pending migrations from backend/migrations
//   npm run migrate -- --list show applied / pending
//
// Each file runs in its own transaction and is recorded in schema_migrations,
// so it is applied exactly once. Files are applied in filename order.
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const DIR = path.join(__dirname, '..', 'migrations');

async function run({ list = false } = {}) {
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map(r => r.name));
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (list) {
        console.log(`${applied.has(file) ? 'applied' : 'pending'}  ${file}`);
        continue;
      }
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`applied  ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
  } finally {
    client.release();
  }
}

module.exports = { run };

if (require.main === module) {
  run({ list: process.argv.includes('--list') })
    .then(() => pool.end())
    .catch((err) => { console.error(err.message); pool.end(); process.exit(1); });
}
