const express = require('express');
const router = express.Router();
const db = require('../db');
const { ownerOnly } = require('../middleware/auth');
const { shopClosedReason } = require('../services/shops');
const { v, handle } = require('../validate');

// ── IMPORTANT: All /my routes MUST be defined BEFORE /:slug ──

// GET /api/shops/my — shop owner gets their shop
router.get('/my', ownerOnly, (req, res) => res.json(req.shop));

// PUT /api/shops/my — update shop profile.
// Only the fields present in the body are changed (saving the profile page
// used to wipe price_per_kg_base, which that page does not send).
router.put('/my', ownerOnly, handle(async (req, res) => {
  const b = req.body || {};
  const updates = {
    name: v.string(b.name, 'Shop name', { min: 1, max: 255, optional: true }),
    description: v.string(b.description, 'Description', { max: 2000, optional: true }),
    city: v.string(b.city, 'City', { max: 100, optional: true }),
    address: v.string(b.address, 'Address', { max: 500, optional: true }),
    phone: v.string(b.phone, 'Phone', { max: 50, optional: true }),
    email: v.email(b.email, 'email', { optional: true }),
    price_per_kg_base: v.number(b.price_per_kg_base, 'Base price', { min: 0, max: 100000, optional: true }),
  };
  if (b.price_per_kg_base === null || b.price_per_kg_base === '') return res.status(400).json({ error: 'Base price is required' });
  const keys = Object.keys(updates).filter(k => updates[k] !== undefined);
  if (!keys.length) return res.status(400).json({ error: 'Nothing to update' });

  const sets = keys.map((k, i) => `${k}=$${i + 1}`).join(', ');
  const result = await db.query(
    `UPDATE shops SET ${sets} WHERE id=$${keys.length + 1} RETURNING *`,
    [...keys.map(k => updates[k]), req.shop.id]
  );
  res.json(result.rows[0]);
}));

const MENU_ORDER = 'ORDER BY sort_order, id';

// GET /api/shops/my/menu
router.get('/my/menu', ownerOnly, handle(async (req, res) => {
  const shopId = req.shop.id;
  const [shapes, sizes, fillings, creams, decorations] = await Promise.all([
    db.query(`SELECT * FROM shop_shapes WHERE shop_id=$1 ${MENU_ORDER}`, [shopId]),
    db.query(`SELECT * FROM shop_sizes WHERE shop_id=$1 ${MENU_ORDER}`, [shopId]),
    db.query(`SELECT * FROM shop_fillings WHERE shop_id=$1 ${MENU_ORDER}`, [shopId]),
    db.query(`SELECT * FROM shop_creams WHERE shop_id=$1 ${MENU_ORDER}`, [shopId]),
    db.query(`SELECT * FROM shop_decorations WHERE shop_id=$1 ${MENU_ORDER}`, [shopId]),
  ]);
  res.json({
    shapes: shapes.rows, sizes: sizes.rows, fillings: fillings.rows,
    creams: creams.rows, decorations: decorations.rows,
  });
}));

// ── Generic CRUD for menu items ─────────────────────────────────────────────
// Table names come only from this whitelist, never from user input.
const menuTables = {
  shapes: 'shop_shapes',
  sizes: 'shop_sizes',
  fillings: 'shop_fillings',
  creams: 'shop_creams',
  decorations: 'shop_decorations',
};

// The 3D viewer draws these shape types; `slug` stores the type, `name` is
// free text. Renaming a shape no longer changes how it is drawn.
const SHAPE_TYPES = ['round', 'square'];
const guessShapeType = (name) => (/square|квадрат|kwadrat|inedördül/i.test(name || '') ? 'square' : 'round');

// Validated column values for a menu item. `partial` = PATCH (all optional).
function menuFields(type, body, partial) {
  const opt = { optional: partial };
  const f = { is_active: v.bool(body.is_active, 'is_active') };
  if (type === 'sizes') {
    f.weight_kg = v.number(body.weight_kg, 'Weight', { min: 0.1, max: 100, ...opt });
    f.price_multiplier = v.number(body.price_multiplier, 'Multiplier', { min: 0.01, max: 99.99, optional: true });
    if (!partial && f.price_multiplier === undefined) f.price_multiplier = 1;
    return f;
  }
  f.name = v.string(body.name, 'Name', { min: 1, max: 100, ...opt });
  if (type === 'decorations') {
    f.price = v.number(body.price, 'Price', { min: 0, max: 100000, optional: true });
    if (!partial && f.price === undefined) f.price = 0;
    return f;
  }
  f.price_modifier = v.number(body.price_modifier, 'Price', { min: -10000, max: 100000, optional: true });
  if (!partial && f.price_modifier === undefined) f.price_modifier = 0;
  if (type === 'shapes') {
    // The dashboard echoes the whole item back on edit, including legacy
    // slugs like "heart" or "custom"; those are ignored rather than rejected.
    f.slug = SHAPE_TYPES.includes(body.slug) ? body.slug : undefined;
    if (!partial && !f.slug) f.slug = guessShapeType(f.name);
  } else {
    f.color = v.color(body.color);
  }
  return f;
}

// POST /api/shops/my/menu/:type — add menu item
router.post('/my/menu/:type', ownerOnly, handle(async (req, res) => {
  const table = menuTables[req.params.type];
  if (!table) return res.status(400).json({ error: 'Invalid type' });
  const f = menuFields(req.params.type, req.body || {}, false);
  const keys = Object.keys(f).filter(k => f[k] !== undefined);

  const result = await db.query(
    `INSERT INTO ${table} (shop_id, ${keys.join(', ')}, sort_order)
     VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')},
             (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM ${table} WHERE shop_id=$1))
     RETURNING *`,
    [req.shop.id, ...keys.map(k => f[k])]
  );
  res.status(201).json(result.rows[0]);
}));

// PATCH /api/shops/my/menu/:type/:id — update menu item
router.patch('/my/menu/:type/:id', ownerOnly, handle(async (req, res) => {
  const table = menuTables[req.params.type];
  if (!table) return res.status(400).json({ error: 'Invalid type' });
  const id = v.id(req.params.id);
  const f = menuFields(req.params.type, req.body || {}, true);
  const keys = Object.keys(f).filter(k => f[k] !== undefined);
  if (!keys.length) return res.status(400).json({ error: 'Nothing to update' });

  const result = await db.query(
    `UPDATE ${table} SET ${keys.map((k, i) => `${k}=$${i + 3}`).join(', ')}
     WHERE id=$1 AND shop_id=$2 RETURNING *`,
    [id, req.shop.id, ...keys.map(k => f[k])]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Item not found' });
  res.json(result.rows[0]);
}));

// DELETE /api/shops/my/menu/:type/:id
router.delete('/my/menu/:type/:id', ownerOnly, handle(async (req, res) => {
  const table = menuTables[req.params.type];
  if (!table) return res.status(400).json({ error: 'Invalid type' });
  const id = v.id(req.params.id);
  const result = await db.query(`DELETE FROM ${table} WHERE id=$1 AND shop_id=$2`, [id, req.shop.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true });
}));

// ── Public routes last (/:slug would match "my" if defined first) ──

// GET /api/shops/:slug/config — public, for cake builder
router.get('/:slug/config', handle(async (req, res) => {
  const shopRes = await db.query(
    `SELECT id, name, slug, description, city, phone, email, logo_url, price_per_kg_base,
            is_active, subscription_status, trial_ends_at
     FROM shops WHERE slug = $1 AND deleted_at IS NULL`,
    [String(req.params.slug).slice(0, 100)]
  );
  if (!shopRes.rows.length || !shopRes.rows[0].is_active) return res.status(404).json({ error: 'Shop not found' });
  const shop = shopRes.rows[0];

  const closed = shopClosedReason(shop);
  if (closed) return res.status(403).json({ error: closed });

  const q = (table) => db.query(`SELECT * FROM ${table} WHERE shop_id=$1 AND is_active=true ${MENU_ORDER}`, [shop.id]);
  const [shapes, sizes, fillings, creams, decorations] = await Promise.all([
    q('shop_shapes'), q('shop_sizes'), q('shop_fillings'), q('shop_creams'), q('shop_decorations'),
  ]);

  res.json({
    shop: {
      id: shop.id, name: shop.name, slug: shop.slug, description: shop.description,
      city: shop.city, phone: shop.phone, email: shop.email, logo_url: shop.logo_url,
      price_per_kg_base: shop.price_per_kg_base,
    },
    shapes: shapes.rows, sizes: sizes.rows, fillings: fillings.rows,
    creams: creams.rows, decorations: decorations.rows,
  });
}));

module.exports = router;
