const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { auth, requireRole } = require('../middleware/auth');

router.use(auth, requireRole('admin'));

// ── Stats ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [shops, orders, users, revenue] = await Promise.all([
      db.query('SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM shops'),
      db.query('SELECT COUNT(*) as total FROM orders'),
      db.query("SELECT COUNT(*) as total FROM users WHERE role != 'admin'"),
      db.query("SELECT COALESCE(SUM(total_price),0) as total FROM orders WHERE status != 'cancelled'"),
    ]);
    const subBreakdown = await db.query(
      'SELECT subscription_status, COUNT(*) as count FROM shops GROUP BY subscription_status'
    );
    res.json({
      total_shops: parseInt(shops.rows[0].total),
      active_shops: parseInt(shops.rows[0].active),
      total_orders: parseInt(orders.rows[0].total),
      total_users: parseInt(users.rows[0].total),
      platform_revenue: parseFloat(revenue.rows[0].total),
      subscription_breakdown: subBreakdown.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Get all shops ─────────────────────────────────────
router.get('/shops', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.full_name as owner_name, u.email as owner_email,
              (SELECT COUNT(*) FROM orders o WHERE o.shop_id = s.id) as total_orders
       FROM shops s
       JOIN users u ON u.id = s.owner_id
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Create shop (+ owner user) ────────────────────────
router.post('/shops', async (req, res) => {
  const {
    owner_full_name, owner_email, owner_password, owner_phone,
    shop_name, shop_slug, shop_description, shop_city, shop_address,
    shop_phone, shop_email, price_per_kg_base,
    subscription_plan, subscription_status,
  } = req.body;

  if (!owner_email || !owner_password || !shop_name || !shop_slug) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check email unique
    const exists = await client.query('SELECT id FROM users WHERE email=$1', [owner_email]);
    if (exists.rows.length) return res.status(400).json({ error: 'Email уже используется' });

    // Check slug unique
    const slugExists = await client.query('SELECT id FROM shops WHERE slug=$1', [shop_slug]);
    if (slugExists.rows.length) return res.status(400).json({ error: 'URL магазина уже занят' });

    // Create user
    const hash = await bcrypt.hash(owner_password, 10);
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone)
       VALUES ($1,$2,'shop_owner',$3,$4) RETURNING *`,
      [owner_email, hash, owner_full_name || '', owner_phone || null]
    );
    const user = userRes.rows[0];

    // Create shop
    const shopRes = await client.query(
      `INSERT INTO shops (owner_id, name, slug, description, city, address, phone, email,
                          price_per_kg_base, subscription_plan, subscription_status, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) RETURNING *`,
      [
        user.id, shop_name, shop_slug,
        shop_description || null, shop_city || null, shop_address || null,
        shop_phone || null, shop_email || null,
        parseFloat(price_per_kg_base) || 15.00,
        subscription_plan || 'starter',
        subscription_status || 'trial',
      ]
    );
    const shop = shopRes.rows[0];

    // Seed default menu options
    await client.query(
      `INSERT INTO shop_shapes (shop_id,name,slug,price_modifier,sort_order) VALUES
       ($1,'Round','round',0,1),($1,'Square','square',2,2),($1,'Heart','heart',5,3)`,
      [shop.id]
    );
    await client.query(
      `INSERT INTO shop_sizes (shop_id,weight_kg,price_multiplier,sort_order) VALUES
       ($1,1,1.0,1),($1,2,1.9,2),($1,3,2.7,3)`,
      [shop.id]
    );
    await client.query(
      `INSERT INTO shop_fillings (shop_id,name,price_modifier,sort_order) VALUES
       ($1,'Chocolate',3,1),($1,'Vanilla',0,2),($1,'Strawberry',2,3),($1,'Red Velvet',4,4)`,
      [shop.id]
    );
    await client.query(
      `INSERT INTO shop_creams (shop_id,name,price_modifier,sort_order) VALUES
       ($1,'Buttercream',0,1),($1,'Chocolate Cream',3,2),($1,'Vanilla Cream',2,3)`,
      [shop.id]
    );
    await client.query(
      `INSERT INTO shop_decorations (shop_id,name,price,sort_order) VALUES
       ($1,'Fresh Fruits',8,1),($1,'Berries',6,2),($1,'Chocolate Pieces',5,3),($1,'Custom Figures',15,4)`,
      [shop.id]
    );

    await client.query('COMMIT');

    res.status(201).json({ shop, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  } finally {
    client.release();
  }
});

// ── Update shop ───────────────────────────────────────
router.patch('/shops/:id', async (req, res) => {
  const {
    is_active, subscription_status, subscription_plan,
    name, description, city, address, phone, email,
    price_per_kg_base,
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE shops SET
        is_active = COALESCE($1, is_active),
        subscription_status = COALESCE($2, subscription_status),
        subscription_plan = COALESCE($3, subscription_plan),
        name = COALESCE($4, name),
        description = COALESCE($5, description),
        city = COALESCE($6, city),
        address = COALESCE($7, address),
        phone = COALESCE($8, phone),
        email = COALESCE($9, email),
        price_per_kg_base = COALESCE($10, price_per_kg_base),
        updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [is_active, subscription_status, subscription_plan,
       name, description, city, address, phone, email,
       price_per_kg_base, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Магазин не найден' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Delete shop ───────────────────────────────────────
router.delete('/shops/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Get owner_id first
    const shopRes = await client.query('SELECT owner_id FROM shops WHERE id=$1', [req.params.id]);
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Магазин не найден' });
    const ownerId = shopRes.rows[0].owner_id;

    // Delete related data
    await client.query('DELETE FROM orders WHERE shop_id=$1', [req.params.id]);
    await client.query('DELETE FROM shop_shapes WHERE shop_id=$1', [req.params.id]);
    await client.query('DELETE FROM shop_sizes WHERE shop_id=$1', [req.params.id]);
    await client.query('DELETE FROM shop_fillings WHERE shop_id=$1', [req.params.id]);
    await client.query('DELETE FROM shop_creams WHERE shop_id=$1', [req.params.id]);
    await client.query('DELETE FROM shop_decorations WHERE shop_id=$1', [req.params.id]);
    await client.query('DELETE FROM shops WHERE id=$1', [req.params.id]);
    await client.query("DELETE FROM users WHERE id=$1 AND role='shop_owner'", [ownerId]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ── All orders ────────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*, s.name as shop_name FROM orders o
       JOIN shops s ON s.id = o.shop_id
       ORDER BY o.created_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── All users ─────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, role, full_name, phone, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
