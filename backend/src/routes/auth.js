const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').notEmpty(),
  body('role').isIn(['shop_owner', 'customer']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, full_name, phone, role, shop_name, shop_slug } = req.body;

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(400).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 10);
    const userResult = await db.query(
      'INSERT INTO users (email, password_hash, role, full_name, phone) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, role, full_name',
      [email, password_hash, role, full_name, phone]
    );
    const user = userResult.rows[0];

    // If shop owner, create their shop
    if (role === 'shop_owner' && shop_name && shop_slug) {
      const slugCheck = await db.query('SELECT id FROM shops WHERE slug = $1', [shop_slug]);
      if (slugCheck.rows.length) return res.status(400).json({ error: 'Shop URL already taken' });

      await db.query(
        `INSERT INTO shops (owner_id, name, slug, email, phone, price_per_kg_base)
         VALUES ($1,$2,$3,$4,$5,15.00)`,
        [user.id, shop_name, shop_slug, email, phone]
      );

      // Seed default options for new shop
      const shopRes = await db.query('SELECT id FROM shops WHERE owner_id = $1', [user.id]);
      const shopId = shopRes.rows[0].id;
      await seedDefaultShopOptions(shopId);
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    let shop = null;
    if (req.user.role === 'shop_owner') {
      const shopRes = await db.query('SELECT * FROM shops WHERE owner_id = $1', [req.user.id]);
      shop = shopRes.rows[0] || null;
    }
    res.json({ user: req.user, shop });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

async function seedDefaultShopOptions(shopId) {
  await db.query(`INSERT INTO shop_shapes (shop_id, name, slug, price_modifier, sort_order) VALUES
    ($1,'Round','round',0,1),($1,'Square','square',2,2),($1,'Heart','heart',5,3)`, [shopId]);
  await db.query(`INSERT INTO shop_sizes (shop_id, weight_kg, price_multiplier, sort_order) VALUES
    ($1,1,1.0,1),($1,2,1.9,2),($1,3,2.7,3)`, [shopId]);
  await db.query(`INSERT INTO shop_fillings (shop_id, name, price_modifier, sort_order) VALUES
    ($1,'Chocolate',3,1),($1,'Vanilla',0,2),($1,'Strawberry',2,3),($1,'Red Velvet',4,4)`, [shopId]);
  await db.query(`INSERT INTO shop_creams (shop_id, name, price_modifier, sort_order) VALUES
    ($1,'Buttercream',0,1),($1,'Chocolate Cream',3,2),($1,'Vanilla Cream',2,3)`, [shopId]);
  await db.query(`INSERT INTO shop_decorations (shop_id, name, price, sort_order) VALUES
    ($1,'Fresh Fruits',8,1),($1,'Berries',6,2),($1,'Chocolate Pieces',5,3),($1,'Custom Figures',15,4)`, [shopId]);
}

module.exports = router;
