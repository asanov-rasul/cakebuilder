// Rate limits for public and auth endpoints. Counters live in process
// memory, which is fine for a single API instance; with several instances
// switch the store to Redis (rate-limit-redis).
const rateLimit = require('express-rate-limit');

const disabled = process.env.RATE_LIMIT_DISABLED === '1';

const limiter = (opts) => rateLimit({
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => disabled,
  ...opts,
});

const tooMany = (error) => ({ error });

// Brute-force protection: per IP + email, failed attempts only.
const loginLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${rateLimit.ipKeyGenerator(req.ip)}|${String(req.body?.email || '').toLowerCase()}`,
  message: tooMany('Too many login attempts, try again in 15 minutes'),
});

const registerLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: tooMany('Too many registrations from this address, try again later'),
});

// Public order form: a real customer places a handful of orders at most.
const orderLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: tooMany('Too many orders from this address, please call the shop'),
});

// Coarse ceiling for everything else.
const apiLimiter = limiter({
  windowMs: 60 * 1000,
  limit: 300,
  message: tooMany('Too many requests'),
});

module.exports = { loginLimiter, registerLimiter, orderLimiter, apiLimiter };
