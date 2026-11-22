// Test harness: a real PostgreSQL per test run.
//  - CI: set TEST_DATABASE_URL to a server you can create databases on.
//  - Locally: nothing to install; an embedded PostgreSQL is started.
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { Client } = require('pg');

const BACKEND = path.join(__dirname, '..');
let embedded = null;
let adminUrl = null;

async function startServer() {
  if (adminUrl) return adminUrl;
  if (process.env.TEST_DATABASE_URL) {
    adminUrl = process.env.TEST_DATABASE_URL;
    return adminUrl;
  }
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const port = 56000 + Math.floor(Math.random() * 2000);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-pg-'));
  embedded = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'pw', port, persistent: false, onLog: () => {} });
  await embedded.initialise();
  await embedded.start();
  adminUrl = `postgresql://postgres:pw@localhost:${port}/postgres`;
  return adminUrl;
}

// Creates an empty database and returns its URL.
async function createDatabase(name) {
  const url = await startServer();
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS ${name}`);
  await c.query(`CREATE DATABASE ${name} ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`);
  await c.end();
  const u = new URL(url);
  u.pathname = `/${name}`;
  return u.toString();
}

async function stopServer() {
  // On Windows the data directory can still be locked for a moment after
  // shutdown; failing to delete a temp folder is not a test failure.
  if (embedded) await embedded.stop().catch(() => {});
  embedded = null;
  adminUrl = null;
}

// Runs a backend script (migrate, create-admin...) as a child process.
function runScript(script, env) {
  return execFileSync(process.execPath, [script], {
    cwd: BACKEND,
    env: { ...process.env, NODE_ENV: 'test', JWT_SECRET: 'test-secret', ...env },
    encoding: 'utf8',
  });
}

// Starts the API on a random port against `databaseUrl`.
// Every call gets its own X-Forwarded-For so rate limits can be tested
// deliberately without one test exhausting another's quota.
function startApi(databaseUrl) {
  Object.assign(process.env, { DATABASE_URL: databaseUrl, NODE_ENV: 'test', JWT_SECRET: 'test-secret', TRUST_PROXY: '1' });
  const app = require('../src/index.js');
  const db = require('../src/db');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const call = async (method, url, { body, token, ip = '10.0.0.1' } = {}) => {
    const r = await fetch(base + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await r.json(); } catch { /* empty body */ }
    return { status: r.status, data, headers: r.headers };
  };

  const close = async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.pool.end();
  };
  return { call, db, close };
}

module.exports = { createDatabase, stopServer, runScript, startApi, BACKEND };
