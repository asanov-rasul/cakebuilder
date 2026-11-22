const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { seedDefaultMenu } = require('../services/shops');
const { v, shopSlug, handle } = require('../validate');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// Compared against when the email is unknown, so a login attempt takes the
// same time whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 10);

const firstError = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  const e = errors.array()[0];
  res.status(400).json({ error: `Invalid ${e.path}` });
  return true;
};

// POST /api/auth/register — public sign-up is for shop owners only.
// (Customers order without an account; the old "customer" role gave access
// to nothing and only created junk accounts.)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8, max: 200 }).withMessage('password'),
], handle(async (req, res) => {
  if (firstError(req, res)) return;
  const b = req.body;
  if (b.role !== undefined && b.role !== 'shop_owner') return res.status(400).json({ error: 'Invalid role' });

  const email = b.email;
  const full_name = v.string(b.full_name, 'Full name', { min: 1, max: 255 });
  const phone = v.string(b.phone, 'Phone', { max: 50, optional: true }) || null;
  const shop_name = v.string(b.shop_name, 'Shop name', { min: 1, max: 255 });
  const shop_slug = shopSlug(b.shop_slug);

  try {
    // User, shop and default menu are created together or not at all.
    const result = await db.withTransaction(async (client) => {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length) return { error: 'Email already registered' };

      const slugCheck = await client.query('SELECT id FROM shops WHERE slug = $1', [shop_slug]);
      if (slugCheck.rows.length) return { error: 'Shop URL already taken' };

      const password_hash = await bcrypt.hash(b.password, 10);
      const user = (await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone)
         VALUES ($1,$2,'shop_owner',$3,$4) RETURNING id, email, role, full_name`,
        [email, password_hash, full_name, phone]
      )).rows[0];

      const shop = (await client.query(
        `INSERT INTO shops (owner_id, name, slug, email, phone, price_per_kg_base)
         VALUES ($1,$2,$3,$4,$5,15.00) RETURNING id`,
        [user.id, shop_name, shop_slug, email, phone]
      )).rows[0];
      await seedDefaultMenu(client, shop.id);
      return { user };
    });

    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ token: signToken(result.user), user: result.user });
  } catch (err) {
    // Two registrations racing for the same email or slug.
    if (err.code === '23505') return res.status(400).json({ error: 'Email or shop URL already taken' });
    throw err;
  }
}));

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
], handle(async (req, res) => {
  if (firstError(req, res)) return;
  const { email, password } = req.body;

  const result = await db.query('SELECT * FROM users WHERE email = $1 AND disabled_at IS NULL', [email]);
  const user = result.rows[0];
  const valid = await bcrypt.compare(String(password), user ? user.password_hash : DUMMY_HASH);
  if (!user || !valid) return res.status(401).json({ error: 'Invalid credentials' });

  const { password_hash, disabled_at, ...safeUser } = user;
  res.json({ token: signToken(user), user: safeUser });
}));

// GET /api/auth/me
router.get('/me', auth, handle(async (req, res) => {
  let shop = null;
  if (req.user.role === 'shop_owner') {
    const shopRes = await db.query('SELECT * FROM shops WHERE owner_id = $1 AND deleted_at IS NULL', [req.user.id]);
    shop = shopRes.rows[0] || null;
  }
  res.json({ user: req.user, shop });
}));

module.exports = router;
