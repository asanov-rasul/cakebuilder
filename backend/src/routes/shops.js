const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// ── IMPORTANT: All /my routes MUST be defined BEFORE /:slug ──

// GET /api/shops/my — shop owner gets their shop
router.get('/my', auth, requireRole('shop_owner'), async (req, res) => {
  try {
    const shopRes = await db.query('SELECT * FROM shops WHERE owner_id = $1', [req.user.id]);
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });
    res.json(shopRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/shops/my — update shop profile
router.put('/my', auth, requireRole('shop_owner'), async (req, res) => {
  const { name, description, city, address, phone, email, price_per_kg_base } = req.body;
  try {
    const result = await db.query(
      `UPDATE shops SET name=$1, description=$2, city=$3, address=$4, phone=$5, email=$6,
       price_per_kg_base=$7, updated_at=NOW() WHERE owner_id=$8 RETURNING *`,
      [name, description, city, address, phone, email, price_per_kg_base, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/shops/my/menu
router.get('/my/menu', auth, requireRole('shop_owner'), async (req, res) => {
  try {
    const shopRes = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });
    const shopId = shopRes.rows[0].id;

    const [shapes, sizes, fillings, creams, decorations] = await Promise.all([
      db.query('SELECT * FROM shop_shapes WHERE shop_id=$1 ORDER BY sort_order', [shopId]),
      db.query('SELECT * FROM shop_sizes WHERE shop_id=$1 ORDER BY sort_order', [shopId]),
      db.query('SELECT * FROM shop_fillings WHERE shop_id=$1 ORDER BY sort_order', [shopId]),
      db.query('SELECT * FROM shop_creams WHERE shop_id=$1 ORDER BY sort_order', [shopId]),
      db.query('SELECT * FROM shop_decorations WHERE shop_id=$1 ORDER BY sort_order', [shopId]),
    ]);

    res.json({
      shapes: shapes.rows, sizes: sizes.rows, fillings: fillings.rows,
      creams: creams.rows, decorations: decorations.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generic CRUD for menu items
const menuTables = {
  shapes: 'shop_shapes',
  sizes: 'shop_sizes',
  fillings: 'shop_fillings',
  creams: 'shop_creams',
  decorations: 'shop_decorations',
};

// POST /api/shops/my/menu/:type — add menu item
router.post('/my/menu/:type', auth, requireRole('shop_owner'), async (req, res) => {
  const table = menuTables[req.params.type];
  if (!table) return res.status(400).json({ error: 'Invalid type' });

  try {
    const shopRes = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });
    const shopId = shopRes.rows[0].id;
    const { name, price_modifier, price, weight_kg, price_multiplier } = req.body;

    let result;
    if (req.params.type === 'sizes') {
      result = await db.query(
        `INSERT INTO ${table} (shop_id, weight_kg, price_multiplier) VALUES ($1,$2,$3) RETURNING *`,
        [shopId, weight_kg || 1, price_multiplier || 1]
      );
    } else if (req.params.type === 'decorations') {
      result = await db.query(
        `INSERT INTO ${table} (shop_id, name, price) VALUES ($1,$2,$3) RETURNING *`,
        [shopId, name, price || 0]
      );
    } else if (req.params.type === 'shapes') {
      // shapes table has a NOT NULL slug column — auto-generate it from name
      const slug = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'custom';
      result = await db.query(
        `INSERT INTO ${table} (shop_id, name, slug, price_modifier) VALUES ($1,$2,$3,$4) RETURNING *`,
        [shopId, name, slug, price_modifier || 0]
      );
    } else {
      result = await db.query(
        `INSERT INTO ${table} (shop_id, name, price_modifier) VALUES ($1,$2,$3) RETURNING *`,
        [shopId, name, price_modifier || 0]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Add menu item error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// PATCH /api/shops/my/menu/:type/:id — update menu item
router.patch('/my/menu/:type/:id', auth, requireRole('shop_owner'), async (req, res) => {
  const table = menuTables[req.params.type];
  if (!table) return res.status(400).json({ error: 'Invalid type' });

  try {
    const shopRes = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });
    const shopId = shopRes.rows[0].id;
    const { is_active, name, price_modifier, price, weight_kg, price_multiplier } = req.body;

    let result;
    if (req.params.type === 'sizes') {
      result = await db.query(
        `UPDATE ${table} SET weight_kg=COALESCE($1,weight_kg), price_multiplier=COALESCE($2,price_multiplier),
         is_active=COALESCE($3,is_active) WHERE id=$4 AND shop_id=$5 RETURNING *`,
        [weight_kg, price_multiplier, is_active, req.params.id, shopId]
      );
    } else if (req.params.type === 'decorations') {
      result = await db.query(
        `UPDATE ${table} SET name=COALESCE($1,name), price=COALESCE($2,price),
         is_active=COALESCE($3,is_active) WHERE id=$4 AND shop_id=$5 RETURNING *`,
        [name, price, is_active, req.params.id, shopId]
      );
    } else if (req.params.type === 'shapes') {
      // if name is being updated, regenerate slug too
      const slugUpdate = name
        ? `slug = '${name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'custom'}',`
        : '';
      result = await db.query(
        `UPDATE ${table} SET name=COALESCE($1,name), ${slugUpdate} price_modifier=COALESCE($2,price_modifier),
         is_active=COALESCE($3,is_active) WHERE id=$4 AND shop_id=$5 RETURNING *`,
        [name, price_modifier, is_active, req.params.id, shopId]
      );
    } else {
      result = await db.query(
        `UPDATE ${table} SET name=COALESCE($1,name), price_modifier=COALESCE($2,price_modifier),
         is_active=COALESCE($3,is_active) WHERE id=$4 AND shop_id=$5 RETURNING *`,
        [name, price_modifier, is_active, req.params.id, shopId]
      );
    }
    if (!result || !result.rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update menu item error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// DELETE /api/shops/my/menu/:type/:id
router.delete('/my/menu/:type/:id', auth, requireRole('shop_owner'), async (req, res) => {
  const table = menuTables[req.params.type];
  if (!table) return res.status(400).json({ error: 'Invalid type' });

  try {
    const shopRes = await db.query('SELECT id FROM shops WHERE owner_id = $1', [req.user.id]);
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });
    const shopId = shopRes.rows[0].id;
    await db.query(`DELETE FROM ${table} WHERE id=$1 AND shop_id=$2`, [req.params.id, shopId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Public routes last (/:slug would match "my" if defined first) ──

// GET /api/shops/:slug/config — public, for cake builder
router.get('/:slug/config', async (req, res) => {
  try {
    const shopRes = await db.query(
      `SELECT id, name, slug, description, city, phone, email, logo_url, price_per_kg_base,
              subscription_status, trial_ends_at
       FROM shops WHERE slug = $1 AND is_active = true`,
      [req.params.slug]
    );
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });
    const shop = shopRes.rows[0];

    const now = new Date();
    if (shop.subscription_status === 'trial' && new Date(shop.trial_ends_at) < now) {
      return res.status(403).json({ error: 'Shop subscription expired' });
    }
    if (shop.subscription_status === 'inactive' || shop.subscription_status === 'expired') {
      return res.status(403).json({ error: 'Shop is inactive' });
    }

    const [shapes, sizes, fillings, creams, decorations] = await Promise.all([
      db.query('SELECT * FROM shop_shapes WHERE shop_id=$1 AND is_active=true ORDER BY sort_order', [shop.id]),
      db.query('SELECT * FROM shop_sizes WHERE shop_id=$1 AND is_active=true ORDER BY sort_order', [shop.id]),
      db.query('SELECT * FROM shop_fillings WHERE shop_id=$1 AND is_active=true ORDER BY sort_order', [shop.id]),
      db.query('SELECT * FROM shop_creams WHERE shop_id=$1 AND is_active=true ORDER BY sort_order', [shop.id]),
      db.query('SELECT * FROM shop_decorations WHERE shop_id=$1 AND is_active=true ORDER BY sort_order', [shop.id]),
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
