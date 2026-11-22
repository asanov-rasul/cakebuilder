const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase, stopServer, runScript, startApi } = require('./helpers');

let api;
let call;
let ownerToken;
let adminToken;
let config;

const OWNER = { email: 'owner@shop.test', password: 'secret-123', full_name: 'Owner', shop_name: 'Shop', shop_slug: 'myshop' };
const ADMIN = { email: 'admin@platform.test', password: 'a-long-admin-password' };

const price = (n) => Math.round(n * 100) / 100;

before(async () => {
  const url = await createDatabase('cb_api');
  runScript('src/migrate.js', { DATABASE_URL: url });
  runScript('scripts/create-admin.js', { DATABASE_URL: url, ADMIN_EMAIL: ADMIN.email, ADMIN_PASSWORD: ADMIN.password });
  api = startApi(url);
  call = api.call;
});

after(async () => {
  if (api) await api.close();
  await stopServer();
});

// Builds a valid order for the current config; `over` overrides fields.
function order(over = {}) {
  const shape = config.shapes.find(s => s.slug === 'round');
  const size = config.sizes.find(s => Number(s.weight_kg) === 2);
  const filling = config.fillings[0];
  const cream = config.creams[1];
  const decor = config.decorations.slice(0, 2);
  const total = price(Number(config.shop.price_per_kg_base) * 2 * Number(size.price_multiplier)
    + Number(shape.price_modifier) + Number(filling.price_modifier) + Number(cream.price_modifier)
    + decor.reduce((s, d) => s + Number(d.price), 0));
  return {
    shop_id: config.shop.id, customer_name: 'Ann', customer_phone: '+993 61 234567',
    shape_id: shape.id, size_id: size.id, filling_id: filling.id, cream_id: cream.id,
    decoration_ids: decor.map(d => d.id), cake_text: 'Happy', total_price: total,
    ...over,
  };
}

test('security headers and health check', async () => {
  const r = await call('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});

test('registration is atomic and validated', async () => {
  const ok = await call('POST', '/auth/register', { body: OWNER });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  ownerToken = ok.data.token;

  const count = async () => (await api.db.query('SELECT count(*)::int c FROM users')).rows[0].c;
  const before = await count();
  const taken = await call('POST', '/auth/register', { body: { ...OWNER, email: 'other@shop.test' } });
  assert.equal(taken.status, 400);
  assert.equal(await count(), before, 'no orphan user when slug is taken');

  assert.equal((await call('POST', '/auth/register', { body: { ...OWNER, email: 'x@shop.test', shop_slug: '' } })).status, 400);
  assert.equal((await call('POST', '/auth/register', { body: { ...OWNER, email: 'x@shop.test', shop_slug: 'my' } })).status, 400, 'reserved slug');
  assert.equal((await call('POST', '/auth/register', { body: { ...OWNER, email: 'x@shop.test', role: 'customer', shop_slug: 'xshop' } })).status, 400, 'no customer sign-up');
  assert.equal((await call('POST', '/auth/register', { body: { ...OWNER, email: 'x@shop.test', password: 'short', shop_slug: 'xshop' } })).status, 400);

  const retry = await call('POST', '/auth/register', { body: { ...OWNER, email: 'other@shop.test', shop_slug: 'othershop' } });
  assert.equal(retry.status, 200, 'same email can retry with a free slug');
});

test('login: 401 on bad credentials, admin can log in', async () => {
  const bad = await call('POST', '/auth/login', { body: { email: OWNER.email, password: 'wrong' }, ip: '10.1.0.1' });
  assert.equal(bad.status, 401);
  const unknown = await call('POST', '/auth/login', { body: { email: 'nobody@shop.test', password: 'wrong' }, ip: '10.1.0.1' });
  assert.equal(unknown.status, 401);
  const adm = await call('POST', '/auth/login', { body: ADMIN, ip: '10.1.0.2' });
  assert.equal(adm.status, 200);
  adminToken = adm.data.token;
});

test('shop profile: partial updates and validation', async () => {
  const p = await call('PUT', '/shops/my', { token: ownerToken, body: { price_per_kg_base: 22.5 } });
  assert.equal(p.status, 200);
  const prof = await call('PUT', '/shops/my', { token: ownerToken, body: { name: 'Shop 2', description: 'd', city: 'c', address: '', phone: '', email: '' } });
  assert.equal(prof.status, 200, JSON.stringify(prof.data));
  assert.equal(prof.data.price_per_kg_base, '22.50', 'profile save keeps the base price');
  assert.equal((await call('PUT', '/shops/my', { token: ownerToken, body: { price_per_kg_base: -1 } })).status, 400);
  assert.equal((await call('PUT', '/shops/my', { token: ownerToken, body: { email: 'not-an-email' } })).status, 400);
  assert.equal((await call('PUT', '/shops/my', { token: ownerToken, body: { name: '' } })).status, 400);
});

test('menu CRUD validates input and scopes to the owner shop', async () => {
  const add = await call('POST', '/shops/my/menu/fillings', { token: ownerToken, body: { name: 'Mango', price_modifier: 4, color: '#ffaa00' } });
  assert.equal(add.status, 201, JSON.stringify(add.data));
  assert.equal(add.data.color, '#ffaa00');

  assert.equal((await call('POST', '/shops/my/menu/fillings', { token: ownerToken, body: { name: '' } })).status, 400);
  assert.equal((await call('POST', '/shops/my/menu/sizes', { token: ownerToken, body: { weight_kg: -2 } })).status, 400);
  assert.equal((await call('POST', '/shops/my/menu/decorations', { token: ownerToken, body: { name: 'X', price: -5 } })).status, 400);
  assert.equal((await call('POST', '/shops/my/menu/bogus', { token: ownerToken, body: { name: 'X' } })).status, 400);
  assert.equal((await call('PATCH', '/shops/my/menu/fillings/abc', { token: ownerToken, body: { name: 'x' } })).status, 400);

  // Renaming a shape keeps its 3D type.
  const menu = (await call('GET', '/shops/my/menu', { token: ownerToken })).data;
  const square = menu.shapes.find(s => s.slug === 'square');
  const renamed = await call('PATCH', `/shops/my/menu/shapes/${square.id}`, { token: ownerToken, body: { ...square, name: 'Квадрат XL' } });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.data));
  assert.equal(renamed.data.slug, 'square');

  // Another owner cannot touch this item.
  const other = (await call('POST', '/auth/login', { body: { email: 'other@shop.test', password: OWNER.password }, ip: '10.1.0.3' })).data.token;
  assert.equal((await call('PATCH', `/shops/my/menu/fillings/${add.data.id}`, { token: other, body: { name: 'hijack' } })).status, 404);
  assert.equal((await call('DELETE', `/shops/my/menu/fillings/${add.data.id}`, { token: other })).status, 404);
  assert.equal((await call('DELETE', `/shops/my/menu/fillings/${add.data.id}`, { token: ownerToken })).status, 200);
});

test('orders are priced on the server', async () => {
  config = (await call('GET', '/shops/myshop/config')).data;
  const body = order();
  const ok = await call('POST', '/orders', { body, ip: '10.2.0.1' });
  assert.equal(ok.status, 201, JSON.stringify(ok.data));
  assert.equal(Number(ok.data.total_price), body.total_price);
  assert.equal(ok.data.price_breakdown.total, body.total_price);
  assert.match(ok.data.order_number, /^CB-[A-Z2-9]{8}$/);
  assert.equal(ok.data.cake_filling, config.fillings[0].name, 'names come from the menu');

  const tampered = await call('POST', '/orders', { body: order({ total_price: 0.01 }), ip: '10.2.0.2' });
  assert.equal(tampered.status, 409);
  assert.equal(tampered.data.total_price, body.total_price);

  for (const [over, why] of [
    [{ filling_id: null }, 'missing filling'],
    [{ filling_id: 999999 }, 'unknown option'],
    [{ size_id: null }, 'missing size'],
    [{ website: 'http://spam' }, 'honeypot'],
    [{ customer_phone: 'abc' }, 'bad phone'],
    [{ delivery_date: '2000-01-01' }, 'past date'],
    [{ shop_id: 'x' }, 'bad shop id'],
  ]) {
    const r = await call('POST', '/orders', { body: order(over), ip: '10.2.0.3' });
    assert.equal(r.status, 400, why);
  }
});

test('order rate limit', async () => {
  const codes = [];
  for (let i = 0; i < 12; i++) codes.push((await call('POST', '/orders', { body: order({ website: 'x' }), ip: '10.3.0.1' })).status);
  assert.ok(codes.includes(429), codes.join());
});

test('closed shops and plan limits stop orders', async () => {
  await api.db.query(`UPDATE shops SET trial_ends_at = NOW() - INTERVAL '1 day' WHERE slug='myshop'`);
  assert.equal((await call('POST', '/orders', { body: order(), ip: '10.4.0.1' })).status, 403);
  await api.db.query(`UPDATE shops SET trial_ends_at = NOW() + INTERVAL '10 days' WHERE slug='myshop'`);

  await api.db.query(`UPDATE subscription_plans SET max_orders = 1 WHERE slug='starter'`);
  try {
    const r = await call('POST', '/orders', { body: order(), ip: '10.4.0.2' });
    assert.equal(r.status, 403, 'monthly limit reached');
    const stats = await call('GET', '/orders/shop/stats', { token: ownerToken });
    assert.deepEqual(stats.data.plan_usage, { plan: 'starter', used: 1, limit: 1 });
  } finally {
    await api.db.query(`UPDATE subscription_plans SET max_orders = 100 WHERE slug='starter'`);
  }
});

test('order list pagination and status updates are validated', async () => {
  assert.equal((await call('GET', '/orders/shop?limit=1000000', { token: ownerToken })).status, 400);
  assert.equal((await call('GET', '/orders/shop?page=abc', { token: ownerToken })).status, 400);
  assert.equal((await call('GET', '/orders/shop?status=bogus', { token: ownerToken })).status, 400);
  const list = await call('GET', '/orders/shop?limit=5', { token: ownerToken });
  assert.equal(list.status, 200);
  const id = list.data.orders[0].id;
  assert.equal((await call('PATCH', `/orders/${id}/status`, { token: ownerToken, body: { status: 'bogus' } })).status, 400);
  const upd = await call('PATCH', `/orders/${id}/status`, { token: ownerToken, body: { status: 'accepted' } });
  assert.equal(upd.status, 200);
  assert.ok(new Date(upd.data.updated_at) >= new Date(upd.data.created_at));
});

test('admin: transactions, validation, soft delete', async () => {
  for (let i = 0; i < 3; i++) {
    const dup = await call('POST', '/admin/shops', { token: adminToken, body: { owner_email: OWNER.email, owner_password: 'password1', shop_name: 'D', shop_slug: `dup${i}x` } });
    assert.equal(dup.status, 400);
  }
  const idle = (await api.db.query(`SELECT count(*)::int c FROM pg_stat_activity WHERE state LIKE 'idle in transaction%' AND datname = current_database()`)).rows[0].c;
  assert.equal(idle, 0, 'no connection left idle in transaction');

  assert.equal((await call('PATCH', '/admin/shops/1', { token: adminToken, body: { subscription_status: 'bogus' } })).status, 400);
  assert.equal((await call('DELETE', '/admin/shops/99999', { token: adminToken })).status, 404);

  const mixed = await call('POST', '/admin/shops', { token: adminToken, body: { owner_email: 'Mixed.Case@Shop.test', owner_password: 'password1', shop_name: 'M', shop_slug: 'mixed' } });
  assert.equal(mixed.status, 201, JSON.stringify(mixed.data));
  const login = await call('POST', '/auth/login', { body: { email: 'Mixed.Case@Shop.test', password: 'password1' }, ip: '10.5.0.1' });
  assert.equal(login.status, 200, 'owner created by admin can log in');

  // Soft delete keeps orders and locks the owner out.
  const shopId = config.shop.id;
  const ordersBefore = (await api.db.query('SELECT count(*)::int c FROM orders WHERE shop_id=$1', [shopId])).rows[0].c;
  assert.equal((await call('DELETE', `/admin/shops/${shopId}`, { token: adminToken })).status, 200);
  assert.equal((await api.db.query('SELECT count(*)::int c FROM orders WHERE shop_id=$1', [shopId])).rows[0].c, ordersBefore);
  assert.equal((await call('GET', '/shops/my', { token: ownerToken })).status, 401, 'existing token stops working');
  assert.equal((await call('GET', '/shops/myshop/config')).status, 404);
  const shops = (await call('GET', '/admin/shops', { token: adminToken })).data;
  assert.ok(!shops.some(s => s.id === shopId));
});

test('errors never leak database details', async () => {
  const r = await call('GET', '/admin/orders?limit=abc', { token: adminToken });
  assert.equal(r.status, 400);
  assert.ok(!/syntax|relation|column/i.test(JSON.stringify(r.data)));
  const tooLong = await call('PUT', '/shops/my', { token: (await call('POST', '/auth/login', { body: { email: 'other@shop.test', password: OWNER.password }, ip: '10.7.0.1' })).data.token, body: { city: 'x'.repeat(5000) } });
  assert.equal(tooLong.status, 400);
  assert.ok(!/value too long|character varying/i.test(JSON.stringify(tooLong.data)));
});

test('login brute force is rate limited', async () => {
  const codes = [];
  for (let i = 0; i < 12; i++) {
    codes.push((await call('POST', '/auth/login', { body: { email: 'other@shop.test', password: 'wrong' }, ip: '10.6.0.1' })).status);
  }
  assert.equal(codes.at(-1), 429, codes.join());
});
