const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createDatabase, stopServer, runScript } = require('./helpers');

after(stopServer);

test('migrations upgrade a database created from the old schema.sql', async () => {
  const url = await createDatabase('cb_legacy');
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    await c.query(fs.readFileSync(path.join(__dirname, 'fixtures/legacy_schema.sql'), 'utf8'));
    const u = (await c.query(`INSERT INTO users (email,password_hash,role,full_name) VALUES ('legacy@x.com','x','shop_owner','L') RETURNING id`)).rows[0];
    const s = (await c.query(`INSERT INTO shops (owner_id,name,slug,price_per_kg_base) VALUES ($1,'Legacy','legacy',NULL) RETURNING id`, [u.id])).rows[0];
    await c.query(`INSERT INTO orders (shop_id,order_number,customer_name,customer_phone,total_price) VALUES ($1,'CB-OLD','a','1',10)`, [s.id]);

    runScript('src/migrate.js', { DATABASE_URL: url });
    const second = runScript('src/migrate.js', { DATABASE_URL: url });
    assert.equal(second.trim(), '', 'second run applies nothing');

    const cols = (await c.query(`SELECT table_name FROM information_schema.columns WHERE column_name='color' ORDER BY 1`)).rows;
    assert.deepEqual(cols.map(r => r.table_name), ['shop_creams', 'shop_fillings']);
    assert.equal((await c.query(`SELECT price_per_kg_base FROM shops WHERE slug='legacy'`)).rows[0].price_per_kg_base, '15.00');
    assert.equal((await c.query('SELECT count(*)::int c FROM orders')).rows[0].c, 1, 'orders preserved');

    const tz = (await c.query(`SELECT data_type FROM information_schema.columns WHERE table_name='orders' AND column_name='created_at'`)).rows[0];
    assert.equal(tz.data_type, 'timestamp with time zone');

    // History is protected: a shop with orders can no longer be hard-deleted.
    await assert.rejects(c.query('DELETE FROM shops WHERE id=$1', [s.id]), /violates foreign key/);
  } finally {
    await c.end();
  }
});

test('a fresh database can be built from migrations and seeded', async () => {
  const url = await createDatabase('cb_fresh');
  runScript('src/migrate.js', { DATABASE_URL: url });
  const out = runScript('scripts/seed-demo.js', { DATABASE_URL: url, DEMO_OWNER_PASSWORD: 'demo-pass-123' });
  assert.match(out, /Demo shop created/);

  assert.throws(() => runScript('scripts/create-admin.js', { DATABASE_URL: url, ADMIN_EMAIL: 'a@b.com', ADMIN_PASSWORD: 'short' }));
  runScript('scripts/create-admin.js', { DATABASE_URL: url, ADMIN_EMAIL: 'Boss@Example.com', ADMIN_PASSWORD: 'a-long-test-password' });
  const c = new Client({ connectionString: url });
  await c.connect();
  const r = (await c.query(`SELECT role FROM users WHERE email='boss@example.com'`)).rows[0];
  await c.end();
  assert.equal(r.role, 'admin');
});
