const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const { loginLimiter, registerLimiter, orderLimiter, apiLimiter } = require('./middleware/rateLimit');
const db = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set; refusing to start');
  process.exit(1);
}

const app = express();

// Behind a reverse proxy (Render, Railway, Nginx...) the client IP is in
// X-Forwarded-For. Without this every request would share the proxy's IP and
// the rate limits below would block all users at once.
const trustProxy = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? '1' : '0');
app.set('trust proxy', Number(trustProxy) || false);

const corsOrigins = (process.env.CORS_ORIGINS || 'https://cakebuilder-beige.vercel.app,http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);

// Middleware
app.use(helmet());
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.post('/api/orders', orderLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shops', require('./routes/shops'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// Health check: also confirms the database answers, so uptime monitors
// notice a lost DB connection, not just a running process.
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date() });
  } catch {
    res.status(503).json({ status: 'db_unavailable', timestamp: new Date() });
  }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler: details go to the log, never to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  console.error(err.stack || err);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`CakeBuilder API running on port ${PORT}`);
  });

  // Graceful shutdown on deploy/restart: stop accepting connections, let
  // in-flight requests finish, then close the DB pool.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => db.pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
