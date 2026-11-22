const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { ownerOnly } = require('../middleware/auth');
const { priceOrder } = require('../services/pricing');
const { shopClosedReason, planUsage } = require('../services/shops');
const { v, handle } = require('../validate');

const STATUSES = ['new', 'accepted', 'in_progress', 'completed', 'cancelled'];

// CB- + 8 random base32 characters: ~10^12 combinations, no time-based
// collisions. Still retried on the (unlikely) UNIQUE violation.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateOrderNumber() {
  const bytes = crypto.randomBytes(8);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `CB-${s}`;
}

// ── IMPORTANT: specific paths BEFORE /:id to avoid conflicts ──

// GET /api/orders/shop/stats — dashboard stats
router.get('/shop/stats', ownerOnly, handle(async (req, res) => {
  const shopId = req.shop.id;
  const [total, statusBreakdown, revenue, recent, usage] = await Promise.all([
    db.query('SELECT COUNT(*) FROM orders WHERE shop_id=$1', [shopId]),
    db.query('SELECT status, COUNT(*) as count FROM orders WHERE shop_id=$1 GROUP BY status', [shopId]),
    db.query(
      `SELECT COALESCE(SUM(total_price),0) as total,
              COALESCE(SUM(CASE WHEN created_at >= NOW()-INTERVAL '30 days' THEN total_price ELSE 0 END),0) as last_30
       FROM orders WHERE shop_id=$1 AND status != 'cancelled'`,
      [shopId]
    ),
    db.query('SELECT * FROM orders WHERE shop_id=$1 ORDER BY created_at DESC LIMIT 5', [shopId]),
    planUsage(db, req.shop),
  ]);

  res.json({
    total_orders: parseInt(total.rows[0].count, 10),
    status_breakdown: statusBreakdown.rows,
    total_revenue: parseFloat(revenue.rows[0].total),
    revenue_last_30: parseFloat(revenue.rows[0].last_30),
    recent_orders: recent.rows,
    plan_usage: usage,
  });
}));

// GET /api/orders/shop — shop owner sees their orders
router.get('/shop', ownerOnly, handle(async (req, res) => {
  const { page, limit, offset } = v.page(req.query, { defaultLimit: 20, maxLimit: 100 });
  const status = v.oneOf(req.query.status, 'status', STATUSES, { optional: true });

  const where = status ? 'shop_id=$1 AND status=$2' : 'shop_id=$1';
  const params = status ? [req.shop.id, status] : [req.shop.id];
  const [result, countRes] = await Promise.all([
    db.query(
      `SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    db.query(`SELECT COUNT(*) FROM orders WHERE ${where}`, params),
  ]);

  res.json({ orders: result.rows, total: parseInt(countRes.rows[0].count, 10), page, limit });
}));

// POST /api/orders — create order (public, no auth).
// The browser sends option ids; names and the total are taken from the
// shop's menu on the server (services/pricing.js).
const PHONE_RE = /^[+\d][\d\s()-]{4,30}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

const str = (val) => (typeof val === 'string' ? val.trim() : '');

router.post('/', handle(async (req, res) => {
  const body = req.body || {};

  // Honeypot: a hidden field real customers never fill in.
  if (str(body.website)) return res.status(400).json({ error: 'Invalid request' });

  const shopId = v.id(body.shop_id, 'shop');
  const customer_name = str(body.customer_name);
  const customer_phone = str(body.customer_phone);
  const cake_text = str(body.cake_text);
  const comment = str(body.comment);
  const delivery_date = str(body.delivery_date);
  const delivery_time = str(body.delivery_time);

  if (!customer_name || customer_name.length > 100) return res.status(400).json({ error: 'Please enter your name (up to 100 characters)' });
  if (!PHONE_RE.test(customer_phone)) return res.status(400).json({ error: 'Please enter a valid phone number' });
  if (cake_text.length > 100) return res.status(400).json({ error: 'Cake text is too long' });
  if (comment.length > 2000) return res.status(400).json({ error: 'Comment is too long' });
  if (delivery_date) {
    const d = new Date(`${delivery_date}T00:00:00Z`);
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    if (!DATE_RE.test(delivery_date) || Number.isNaN(d.getTime()) || d < yesterday) {
      return res.status(400).json({ error: 'Invalid delivery date' });
    }
  }
  if (delivery_time && !TIME_RE.test(delivery_time)) return res.status(400).json({ error: 'Invalid delivery time' });

  const shopRes = await db.query(
    `SELECT id, is_active, subscription_status, subscription_plan, trial_ends_at, price_per_kg_base
     FROM shops WHERE id=$1 AND deleted_at IS NULL`,
    [shopId]
  );
  if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });
  const shop = shopRes.rows[0];

  // Same rule as the storefront (GET /shops/:slug/config).
  const closed = shopClosedReason(shop);
  if (closed) return res.status(403).json({ error: closed });

  // Plan limit (e.g. Starter: 100 orders per calendar month).
  const usage = await planUsage(db, shop);
  if (usage.limit !== null && usage.used >= usage.limit) {
    return res.status(403).json({ error: 'This shop cannot accept more online orders this month, please call the shop' });
  }

  const priced = await priceOrder(db, shop, {
    shape_id: body.shape_id,
    size_id: body.size_id,
    filling_id: body.filling_id,
    cream_id: body.cream_id,
    decoration_ids: body.decoration_ids,
  });

  // If the customer saw a different total (the shop changed its prices
  // while they were building the cake), ask them to review it.
  if (body.total_price !== undefined && body.total_price !== null) {
    const seen = Number(body.total_price);
    if (!Number.isFinite(seen) || Math.abs(seen - priced.total) > 0.005) {
      return res.status(409).json({ error: 'Prices have changed, please review your order', total_price: priced.total });
    }
  }

  const decorationNames = priced.decorations.map(d => d.name);
  const cake_config = {
    shape: priced.shape?.name ?? null,
    size_kg: priced.size.weight_kg,
    filling: priced.filling?.name ?? null,
    cream: priced.cream?.name ?? null,
    decorations: decorationNames,
    text: cake_text,
  };
  const values = [
    shop.id, customer_name, customer_phone,
    cake_config.shape, cake_config.size_kg, cake_config.filling, cake_config.cream,
    decorationNames, cake_text || null, JSON.stringify(cake_config), priced.total,
    JSON.stringify(priced.breakdown),
    delivery_date || null, delivery_time || null, comment || null,
  ];

  for (let attempt = 0; ; attempt++) {
    try {
      const result = await db.query(
        `INSERT INTO orders (
          shop_id, customer_name, customer_phone,
          cake_shape, cake_size_kg, cake_filling, cake_cream,
          cake_decorations, cake_text, cake_config, total_price, price_breakdown,
          delivery_date, delivery_time, comment, order_number
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [...values, generateOrderNumber()]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'orders_order_number_key' && attempt < 3) continue;
      throw err;
    }
  }
}));

// PATCH /api/orders/:id/status — update order status
router.patch('/:id/status', ownerOnly, handle(async (req, res) => {
  const id = v.id(req.params.id, 'order');
  const status = v.oneOf(req.body?.status, 'status', STATUSES);
  const result = await db.query(
    'UPDATE orders SET status=$1 WHERE id=$2 AND shop_id=$3 RETURNING *',
    [status, id, req.shop.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
  res.json(result.rows[0]);
}));

module.exports = router;
