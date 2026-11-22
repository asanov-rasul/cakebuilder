# 🍰 CakeBuilder — Custom Cake Ordering SaaS

A full-stack SaaS platform for cake shops to accept custom cake orders online.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + React Router 6 + Zustand + CSS Modules |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Fonts | Fraunces (display) + DM Sans (body) |

---

## Project Structure

```
cakebuilder/
├── backend/
│   ├── migrations/           # Numbered SQL migrations (npm run migrate)
│   ├── scripts/              # create-admin.js, seed-demo.js
│   ├── src/
│   │   ├── index.js          # Express server entry
│   │   ├── db.js             # PostgreSQL pool + withTransaction
│   │   ├── migrate.js        # Migration runner
│   │   ├── services/
│   │   │   ├── pricing.js    # Server-side order pricing
│   │   │   └── shops.js      # Default menu, shop open/closed rules
│   │   ├── middleware/
│   │   │   ├── auth.js       # JWT auth + role guard
│   │   │   └── rateLimit.js  # Login / register / order limits
│   │   └── routes/
│   │       ├── auth.js       # Register, login, /me
│   │       ├── shops.js      # Shop config + menu CRUD
│   │       ├── orders.js     # Create + manage orders
│   │       └── admin.js      # Admin panel APIs
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/index.html
    └── src/
        ├── App.js            # Routes + guards
        ├── index.js
        ├── styles/global.css # Design tokens + global styles
        ├── utils/api.js      # Axios client
        ├── store/
        │   ├── authStore.js  # Zustand auth state
        │   └── cakeStore.js  # 6-step cake builder state
        ├── pages/
        │   ├── LandingPage   # Marketing homepage
        │   ├── LoginPage     # Sign in
        │   ├── RegisterPage  # 2-step shop registration
        │   ├── ShopPage      # Public cake builder (/shop/:slug)
        │   ├── ShopDashboard # Shop owner dashboard
        │   └── AdminDashboard# Platform admin panel
        └── components/
            ├── cake-builder/
            │   ├── CakeBuilder.js   # Step orchestrator
            │   ├── Steps.js         # All 6 step components
            │   ├── CakeSummary.js   # Live summary
            │   └── OrderForm.js     # Checkout form
            └── dashboard/
                ├── DashOverview.js  # Stats + recent orders
                ├── DashOrders.js    # Orders table + detail modal
                ├── DashMenu.js      # Menu management
                ├── DashPricing.js   # Pricing management
                └── DashProfile.js   # Shop profile
```

---

## Setup & Running

### 1. Database + backend

```bash
createdb cakebuilder

cd backend
npm install

# Copy and configure env
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET (long random string), CORS_ORIGINS

# Create / upgrade the schema (SQL files in backend/migrations, each applied once)
npm run migrate

# Create the platform admin (password is never stored in the repo)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run create-admin

# Optional, local development only: demo shop at /shop/sweetcake
npm run seed:demo

npm run dev
# Server runs on http://localhost:5000
```

Schema changes go into a new numbered file in `backend/migrations/`
(e.g. `003_add_indexes.sql`); never edit a migration that was already applied.

**Production:** run `npm run migrate` on every deploy before starting the API.
Set `TRUST_PROXY` to the number of proxies in front of the API (usually `1`)
so rate limits see real client IPs.

### 2. Frontend

```bash
cd frontend
npm install
npm start          # Vite dev server on http://localhost:3000
npm run build      # production build into frontend/build
```

The API address comes from `REACT_APP_API_URL` (or `VITE_API_URL`) at build
time; default `http://localhost:5000`. Requires Node 20.19+.

### 3. Tests

```bash
cd backend && npm test     # API + migrations against a real PostgreSQL
cd frontend && npm test    # pricing preview and menu presets
```

Backend tests start an embedded PostgreSQL automatically; set
`TEST_DATABASE_URL` to use an existing server instead (CI does this).
GitHub Actions (`.github/workflows/ci.yml`) runs both suites, `npm audit`
and the frontend build on every push and pull request.

### 4. Deploy notes

- **API:** run `npm run migrate` before starting a new version; set
  `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`, `TRUST_PROXY`.
- **Frontend (Vercel):** the project's Root Directory must be `frontend`.
  `frontend/vercel.json` sets the Vite build, the SPA fallback and security
  headers (CSP). If the API is on a fixed domain, narrow `connect-src` in the
  CSP from `https:` to that domain.

---

## Demo Data

`npm run seed:demo` creates the owner `owner@sweetcake.com` and prints a
generated password (or uses `DEMO_OWNER_PASSWORD`). Demo shop URL:
**http://localhost:3000/shop/sweetcake**. The admin account is created with
`npm run create-admin`; no default admin password exists.

---

## Key Features

### Customer Flow
1. Visit `/shop/sweetcake`
2. Build cake step-by-step (shape → size → filling → cream → decorations → text)
3. Live price calculation throughout
4. Fill delivery form → order saved to DB

### Shop Owner Dashboard (`/dashboard`)
- **Overview**: revenue stats, order status breakdown, recent orders
- **Orders**: filterable table, click to see full detail, advance status (New → Accepted → In Progress → Completed)
- **Menu**: add/edit/toggle/delete shapes, fillings, creams, decorations
- **Pricing**: set base price per kg, size multipliers, per-item add-on prices
- **Profile**: edit shop name, description, city, contact info

### Admin Panel (`/admin`)
- **Overview**: platform-wide stats, subscription breakdown
- **Shops**: view all shops, change subscription plan/status, activate/deactivate
- **Orders**: view all orders across all shops
- **Users**: view all users grouped by role

### Subscription System
- 14-day free trial on registration
- Starter ($10/mo): up to 100 orders
- Business ($20/mo): unlimited orders + analytics
- Admin can manually change plan and status per shop

---

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/shops/:slug/config     (public)
GET    /api/shops/my
PUT    /api/shops/my
GET    /api/shops/my/menu
POST   /api/shops/my/menu/:type
PATCH  /api/shops/my/menu/:type/:id
DELETE /api/shops/my/menu/:type/:id

POST   /api/orders
GET    /api/orders/shop
GET    /api/orders/shop/stats
PATCH  /api/orders/:id/status

GET    /api/admin/stats
GET    /api/admin/shops
PATCH  /api/admin/shops/:id
GET    /api/admin/orders
GET    /api/admin/users
```
