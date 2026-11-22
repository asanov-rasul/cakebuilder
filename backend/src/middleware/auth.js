const jwt = require('jsonwebtoken');
const db = require('../db');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // Disabled users (e.g. owner of a deleted shop) lose access immediately,
    // even with a token that has not expired yet.
    const result = await db.query(
      'SELECT id, email, role, full_name FROM users WHERE id = $1 AND disabled_at IS NULL',
      [decoded.id]
    );
    if (!result.rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(err);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// For shop-owner routes: loads the owner's (not deleted) shop into req.shop.
const loadOwnerShop = async (req, res, next) => {
  try {
    const r = await db.query('SELECT * FROM shops WHERE owner_id = $1 AND deleted_at IS NULL', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Shop not found' });
    req.shop = r.rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

const ownerOnly = [auth, requireRole('shop_owner'), loadOwnerShop];

module.exports = { auth, requireRole, loadOwnerShop, ownerOnly };
