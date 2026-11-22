// Small input-validation helpers. Each `v.*` checker returns the cleaned
// value or throws a ValidationError (sent as HTTP 400 by the route).
const { isEmail } = require('validator');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const fail = (msg) => { throw new ValidationError(msg); };

const v = {
  // Trimmed string with a length range. `optional` lets undefined/null through as undefined.
  string(value, label, { min = 0, max = 255, optional = false } = {}) {
    if (value === undefined || value === null) {
      if (optional) return undefined;
      fail(`${label} is required`);
    }
    if (typeof value !== 'string') fail(`${label} must be text`);
    const s = value.trim();
    if (s.length < min) fail(min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`);
    if (s.length > max) fail(`${label} must be at most ${max} characters`);
    return s;
  },

  number(value, label, { min = -Infinity, max = Infinity, optional = false, integer = false } = {}) {
    if (value === undefined || value === null || value === '') {
      if (optional) return undefined;
      fail(`${label} is required`);
    }
    const n = Number(value);
    if (!Number.isFinite(n) || (integer && !Number.isInteger(n))) fail(`${label} must be a number`);
    if (n < min || n > max) fail(`${label} must be between ${min} and ${max}`);
    return n;
  },

  bool(value, label, { optional = true } = {}) {
    if (value === undefined || value === null) {
      if (optional) return undefined;
      fail(`${label} is required`);
    }
    if (typeof value !== 'boolean') fail(`${label} must be true or false`);
    return value;
  },

  oneOf(value, label, allowed, { optional = false } = {}) {
    if (value === undefined || value === null || value === '') {
      if (optional) return undefined;
      fail(`${label} is required`);
    }
    if (!allowed.includes(value)) fail(`Invalid ${label}`);
    return value;
  },

  // Empty string clears an optional email field.
  email(value, label, { optional = false } = {}) {
    if (value === undefined || value === null) {
      if (optional) return undefined;
      fail(`${label} is required`);
    }
    const s = typeof value === 'string' ? value.trim() : '';
    if (!s && optional) return '';
    if (!isEmail(s) || s.length > 255) fail(`Invalid ${label}`);
    return s;
  },

  id(value, label = 'id') {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0 || n > 2147483647) fail(`Invalid ${label}`);
    return n;
  },

  color(value, label = 'color', { optional = true } = {}) {
    if (value === undefined || value === null || value === '') {
      if (optional) return undefined;
      fail(`${label} is required`);
    }
    if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) fail(`Invalid ${label}`);
    return value.toLowerCase();
  },

  // ?page=&limit= with sane bounds.
  page(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
    const page = v.number(query.page, 'page', { min: 1, max: 100000, optional: true, integer: true }) || 1;
    const limit = v.number(query.limit, 'limit', { min: 1, max: maxLimit, optional: true, integer: true }) || defaultLimit;
    return { page, limit, offset: (page - 1) * limit };
  },
};

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58})[a-z0-9]$/;
const RESERVED_SLUGS = new Set(['my', 'admin', 'api', 'dashboard', 'login', 'register']);

function shopSlug(value) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!SLUG_RE.test(s) || RESERVED_SLUGS.has(s)) {
    fail('Shop URL must be 3-60 characters: latin letters, digits and dashes');
  }
  return s;
}

// Wraps an async route so ValidationError -> 400 and anything else -> the
// central error handler (which logs it and answers 500 without details).
const handle = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err && err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    next(err);
  });

module.exports = { v, ValidationError, shopSlug, handle };
