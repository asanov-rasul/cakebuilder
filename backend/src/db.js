const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

// Runs fn(client) inside BEGIN/COMMIT. Any throw - and any early return
// path in fn - ends the transaction, so a client never goes back to the
// pool with a transaction still open.
async function withTransaction(fn) {
  const client = await pool.connect();
  let finished = false;
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    finished = true;
    return result;
  } finally {
    if (!finished) {
      await client.query('ROLLBACK').catch(() => {});
    }
    client.release();
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  withTransaction,
};
