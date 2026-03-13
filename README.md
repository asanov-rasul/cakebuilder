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
│   ├── src/
│   │   ├── index.js          # Express server entry
│   │   ├── db.js             # PostgreSQL pool
│   │   ├── schema.sql        # Full DB schema + seed data
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT auth + role guard
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

### 1. Database

```bash
# Create database
createdb cakebuilder

# Run schema (creates tables + seeds demo data)
psql cakebuilder < backend/src/schema.sql
```

### 2. Backend

```bash
cd backend
npm install

# Copy and configure env
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET

npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm start
# App runs on http://localhost:3000
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cakebuilder.com | admin123 |
| Shop Owner | owner@sweetcake.com | demo123 |

Demo shop URL: **http://localhost:3000/shop/sweetcake**

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
