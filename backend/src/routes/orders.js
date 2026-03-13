const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CB-${timestamp}-${random}`;
}

// ── IMPORTANT: specific paths BEFORE /:id to avoid conflicts ──

// GET /api/orders/shop/stats — dashboard stats
router.get('/shop/stats', auth, requireRole('shop_owner'), async (req, res) => {
  try {
    const shopRes = await db.query('SELECT id FROM shops WHERE owner_id=$1', [req.user.id]);
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });
    const shopId = shopRes.rows[0].id;

    const [total, statusBreakdown, revenue, recent] = await Promise.all([
      db.query('SELECT COUNT(*) FROM orders WHERE shop_id=$1', [shopId]),
      db.query('SELECT status, COUNT(*) as count FROM orders WHERE shop_id=$1 GROUP BY status', [shopId]),
      db.query(
        `SELECT COALESCE(SUM(total_price),0) as total,
                COALESCE(SUM(CASE WHEN created_at >= NOW()-INTERVAL '30 days' THEN total_price ELSE 0 END),0) as last_30
         FROM orders WHERE shop_id=$1 AND status != 'cancelled'`,
        [shopId]
      ),
      db.query('SELECT * FROM orders WHERE shop_id=$1 ORDER BY created_at DESC LIMIT 5', [shopId]),
    ]);

    res.json({
      total_orders: parseInt(total.rows[0].count),
      status_breakdown: statusBreakdown.rows,
      total_revenue: parseFloat(revenue.rows[0].total),
      revenue_last_30: parseFloat(revenue.rows[0].last_30),
      recent_orders: recent.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/shop — shop owner sees their orders
router.get('/shop', auth, requireRole('shop_owner'), async (req, res) => {
  try {
    const shopRes = await db.query('SELECT id FROM shops WHERE owner_id=$1', [req.user.id]);
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });
    const shopId = shopRes.rows[0].id;

    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM orders WHERE shop_id=$1';
    const params = [shopId];

    if (status) {
      query += ` AND status=$${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const countRes = await db.query(
      'SELECT COUNT(*) FROM orders WHERE shop_id=$1' + (status ? ' AND status=$2' : ''),
      status ? [shopId, status] : [shopId]
    );

    res.json({
      orders: result.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders — create order (public, no auth)
router.post('/', async (req, res) => {
  const {
    shop_id, customer_name, customer_phone,
    cake_shape, cake_size_kg, cake_filling, cake_cream,
    cake_decorations, cake_text, cake_config, total_price,
    delivery_date, delivery_time, comment,
  } = req.body;

  if (!shop_id || !customer_name || !customer_phone || !total_price) {
    return res.status(400).json({ error: 'Missing required fields: shop_id, customer_name, customer_phone, total_price' });
  }

  try {
    const shopRes = await db.query(
      'SELECT id FROM shops WHERE id=$1 AND is_active=true',
      [shop_id]
    );
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });

    const order_number = generateOrderNumber();
    const result = await db.query(
      `INSERT INTO orders (
        shop_id, customer_name, customer_phone, order_number,
        cake_shape, cake_size_kg, cake_filling, cake_cream,
        cake_decorations, cake_text, cake_config, total_price,
        delivery_date, delivery_time, comment
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        shop_id, customer_name, customer_phone, order_number,
        cake_shape, cake_size_kg, cake_filling, cake_cream,
        Array.isArray(cake_decorations) ? cake_decorations : [],
        cake_text,
        cake_config ? JSON.stringify(cake_config) : null,
        total_price,
        delivery_date || null, delivery_time || null, comment || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// PATCH /api/orders/:id/status — update order status
router.patch('/:id/status', auth, requireRole('shop_owner'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['new', 'accepted', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const shopRes = await db.query('SELECT id FROM shops WHERE owner_id=$1', [req.user.id]);
    if (!shopRes.rows.length) return res.status(404).json({ error: 'Shop not found' });
    const shopId = shopRes.rows[0].id;

    const result = await db.query(
      'UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2 AND shop_id=$3 RETURNING *',
      [status, req.params.id, shopId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
