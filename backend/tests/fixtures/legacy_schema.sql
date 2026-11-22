-- CakeBuilder SaaS Database Schema

-- Users table (all roles)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'shop_owner', 'customer')),
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cake shops table
CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  city VARCHAR(100),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  subscription_plan VARCHAR(20) DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'business')),
  subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'inactive', 'expired')),
  trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days'),
  subscription_ends_at TIMESTAMP,
  price_per_kg_base DECIMAL(10,2) DEFAULT 15.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cake shapes offered by shop
CREATE TABLE IF NOT EXISTS shop_shapes (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Cake sizes
CREATE TABLE IF NOT EXISTS shop_sizes (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  weight_kg DECIMAL(4,1) NOT NULL,
  price_multiplier DECIMAL(4,2) DEFAULT 1.00,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Cake fillings
CREATE TABLE IF NOT EXISTS shop_fillings (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Cream options
CREATE TABLE IF NOT EXISTS shop_creams (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Decoration options
CREATE TABLE IF NOT EXISTS shop_decorations (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  -- Cake config stored as JSON
  cake_shape VARCHAR(50),
  cake_size_kg DECIMAL(4,1),
  cake_filling VARCHAR(100),
  cake_cream VARCHAR(100),
  cake_decorations TEXT[], -- array of decoration names
  cake_text VARCHAR(255),
  cake_config JSONB,
  -- Pricing
  total_price DECIMAL(10,2) NOT NULL,
  -- Delivery
  delivery_date DATE,
  delivery_time TIME,
  comment TEXT,
  -- Status
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscription plans reference
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(20) UNIQUE NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  max_orders INTEGER,
  features JSONB,
  is_active BOOLEAN DEFAULT true
);

-- Seed subscription plans
INSERT INTO subscription_plans (name, slug, price_monthly, max_orders, features) VALUES
('Starter', 'starter', 10.00, 100, '{"orders": 100, "customizations": true, "analytics": false, "priority_support": false}'),
('Business', 'business', 20.00, NULL, '{"orders": "unlimited", "customizations": true, "analytics": true, "priority_support": true}')
ON CONFLICT (slug) DO NOTHING;
