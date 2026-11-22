const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { normalizeEmail } = require('validator');
const { auth, requireRole } = require('../middleware/auth');
const { seedDefaultMenu } = require('../services/shops');
const { v, shopSlug, handle } = require('../validate');

const PLANS = ['starter', 'business'];
const SUB_STATUSES = ['trial', 'active', 'inactive', 'expired'];

router.use(auth, requireRole('admin'));

const optDate = (value, label) => {
  if (value === undefined || value === null || value === '') return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw Object.assign(new Error(`Invalid ${label}`), { status: 400 });
  return d.toISOString();
};

// ── Stats ─────────────────────────────────────────────
router.get('/stats', handle(async (req, res) => {
  const [shops, orders, users, revenue, subBreakdown] = await Promise.all([
    db.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM shops WHERE deleted_at IS NULL'),
    db.query('SELECT COUNT(*) as total FROM orders'),
    db.query("SELECT COUNT(*) as total FROM users WHERE role != 'admin' AND disabled_at IS NULL"),
    db.query("SELECT COALESCE(SUM(total_price),0) as total FROM orders WHERE status != 'cancelled'"),
    db.query('SELECT subscription_status, COUNT(*) as count FROM shops WHERE deleted_at IS NULL GROUP BY subscription_status'),
  ]);
  res.json({
    total_shops: parseInt(shops.rows[0].total, 10),
    active_shops: parseInt(shops.rows[0].active, 10),
    total_orders: parseInt(orders.rows[0].total, 10),
    total_users: parseInt(users.rows[0].total, 10),
    platform_revenue: parseFloat(revenue.rows[0].total),
    subscription_breakdown: subBreakdown.rows,
  });
}));

// ── Get all shops ─────────────────────────────────────
router.get('/shops', handle(async (req, res) => {
  const result = await db.query(
    `SELECT s.*, u.full_name as owner_name, u.email as owner_email,
            COALESCE(oc.total_orders, 0) as total_orders
     FROM shops s
     JOIN users u ON u.id = s.owner_id
     LEFT JOIN (SELECT shop_id, COUNT(*) AS total_orders FROM orders GROUP BY shop_id) oc ON oc.shop_id = s.id
     WHERE s.deleted_at IS NULL
     ORDER BY s.created_at DESC`
  );
  res.json(result.rows);
}));

// ── Create shop (+ owner user) ────────────────────────
router.post('/shops', handle(async (req, res) => {
  const b = req.body || {};
  // Same normalisation as /auth/register and /auth/login, otherwise an owner
  // created here with "Owner@Shop.com" could never log in.
  const owner_email = typeof b.owner_email === 'string' ? normalizeEmail(b.owner_email.trim()) || '' : '';
  if (!owner_email || !b.owner_password || !b.shop_name || !b.shop_slug) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }
  v.email(owner_email, 'owner email');
  const owner_password = v.string(b.owner_password, 'Пароль', { min: 8, max: 200 });
  const owner_full_name = v.string(b.owner_full_name, 'Имя', { max: 255, optional: true }) || '';
  const owner_phone = v.string(b.owner_phone, 'Телефон', { max: 50, optional: true }) || null;
  const shop_name = v.string(b.shop_name, 'Название', { min: 1, max: 255 });
  const shop_slug = shopSlug(b.shop_slug);
  const shop = {
    description: v.string(b.shop_description, 'Описание', { max: 2000, optional: true }) || null,
    city: v.string(b.shop_city, 'Город', { max: 100, optional: true }) || null,
    address: v.string(b.shop_address, 'Адрес', { max: 500, optional: true }) || null,
    phone: v.string(b.shop_phone, 'Телефон магазина', { max: 50, optional: true }) || null,
    email: v.email(b.shop_email, 'email магазина', { optional: true }) || null,
    price: v.number(b.price_per_kg_base, 'Цена', { min: 0, max: 100000, optional: true }) ?? 15,
    plan: v.oneOf(b.subscription_plan, 'тариф', PLANS, { optional: true }) || 'starter',
    status: v.oneOf(b.subscription_status, 'статус', SUB_STATUSES, { optional: true }) || 'trial',
  };

  try {
    const result = await db.withTransaction(async (client) => {
      const exists = await client.query('SELECT id FROM users WHERE email=$1', [owner_email]);
      if (exists.rows.length) return { error: 'Email уже используется' };

      const slugExists = await client.query('SELECT id FROM shops WHERE slug=$1', [shop_slug]);
      if (slugExists.rows.length) return { error: 'URL магазина уже занят' };

      const hash = await bcrypt.hash(owner_password, 10);
      const user = (await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone)
         VALUES ($1,$2,'shop_owner',$3,$4) RETURNING id, email, full_name`,
        [owner_email, hash, owner_full_name, owner_phone]
      )).rows[0];

      const created = (await client.query(
        `INSERT INTO shops (owner_id, name, slug, description, city, address, phone, email,
                            price_per_kg_base, subscription_plan, subscription_status, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) RETURNING *`,
        [user.id, shop_name, shop_slug, shop.description, shop.city, shop.address,
         shop.phone, shop.email, shop.price, shop.plan, shop.status]
      )).rows[0];

      await seedDefaultMenu(client, created.id);
      return { shop: created, user };
    });

    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email или URL магазина уже заняты' });
    throw err;
  }
}));

// ── Update shop ───────────────────────────────────────
router.patch('/shops/:id', handle(async (req, res) => {
  const id = v.id(req.params.id);
  const b = req.body || {};

  const f = {
    is_active: v.bool(b.is_active, 'is_active'),
    subscription_status: v.oneOf(b.subscription_status, 'статус', SUB_STATUSES, { optional: true }),
    subscription_plan: v.oneOf(b.subscription_plan, 'тариф', PLANS, { optional: true }),
    name: v.string(b.name, 'Название', { min: 1, max: 255, optional: true }),
    description: v.string(b.description, 'Описание', { max: 2000, optional: true }),
    city: v.string(b.city, 'Город', { max: 100, optional: true }),
    address: v.string(b.address, 'Адрес', { max: 500, optional: true }),
    phone: v.string(b.phone, 'Телефон', { max: 50, optional: true }),
    email: v.email(b.email, 'email', { optional: true }),
    price_per_kg_base: v.number(b.price_per_kg_base, 'Цена', { min: 0, max: 100000, optional: true }),
    trial_ends_at: optDate(b.trial_ends_at, 'trial_ends_at'),
    subscription_ends_at: optDate(b.subscription_ends_at, 'subscription_ends_at'),
  };
  // Convenience: number of trial days from now.
  const trialDays = v.number(b.trial_days, 'Дни', { min: 0, max: 3650, optional: true, integer: true });
  if (trialDays !== undefined) {
    f.trial_ends_at = new Date(Date.now() + trialDays * 24 * 3600 * 1000).toISOString();
  }

  const keys = Object.keys(f).filter(k => f[k] !== undefined);
  if (!keys.length) return res.status(400).json({ error: 'Нечего обновлять' });

  const result = await db.query(
    `UPDATE shops SET ${keys.map((k, i) => `${k}=$${i + 2}`).join(', ')}
     WHERE id=$1 AND deleted_at IS NULL RETURNING *`,
    [id, ...keys.map(k => f[k])]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Магазин не найден' });
  res.json(result.rows[0]);
}));

// ── Delete shop ───────────────────────────────────────
// Soft delete: the shop disappears from the platform and its owner can no
// longer log in, but its orders (financial history) are kept.
router.delete('/shops/:id', handle(async (req, res) => {
  const id = v.id(req.params.id);
  const found = await db.withTransaction(async (client) => {
    const shopRes = await client.query(
      'UPDATE shops SET deleted_at=NOW(), is_active=false WHERE id=$1 AND deleted_at IS NULL RETURNING owner_id',
      [id]
    );
    if (!shopRes.rows.length) return false;
    await client.query(
      "UPDATE users SET disabled_at=NOW() WHERE id=$1 AND role='shop_owner' AND disabled_at IS NULL",
      [shopRes.rows[0].owner_id]
    );
    return true;
  });
  if (!found) return res.status(404).json({ error: 'Магазин не найден' });
  res.json({ success: true });
}));

// ── All orders ────────────────────────────────────────
router.get('/orders', handle(async (req, res) => {
  const { limit, offset } = v.page(req.query, { defaultLimit: 200, maxLimit: 500 });
  const result = await db.query(
    `SELECT o.*, s.name as shop_name FROM orders o
     JOIN shops s ON s.id = o.shop_id
     ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json(result.rows);
}));

// ── All users ─────────────────────────────────────────
router.get('/users', handle(async (req, res) => {
  const { limit, offset } = v.page(req.query, { defaultLimit: 500, maxLimit: 1000 });
  const result = await db.query(
    `SELECT id, email, role, full_name, phone, created_at FROM users
     WHERE disabled_at IS NULL ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  res.json(result.rows);
}));

module.exports = router;
