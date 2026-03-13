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

-- Seed admin user (password: admin123)
INSERT INTO users (email, password_hash, role, full_name) VALUES
('admin@cakebuilder.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Platform Admin')
ON CONFLICT (email) DO NOTHING;

-- Seed demo shop owner (password: demo123)
INSERT INTO users (email, password_hash, role, full_name, phone) VALUES
('owner@sweetcake.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'shop_owner', 'Sarah Johnson', '+1 555 0101')
ON CONFLICT (email) DO NOTHING;

-- Function to create default shop options
CREATE OR REPLACE FUNCTION seed_demo_shop() RETURNS void AS $$
DECLARE
  owner_id INTEGER;
  shop_id INTEGER;
BEGIN
  SELECT id INTO owner_id FROM users WHERE email = 'owner@sweetcake.com';

  INSERT INTO shops (owner_id, name, slug, description, city, phone, email, price_per_kg_base)
  VALUES (owner_id, 'Sweet Cake', 'sweetcake', 'Premium custom cakes for every occasion', 'New York', '+1 555 0101', 'hello@sweetcake.com', 15.00)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO shop_id;

  IF shop_id IS NOT NULL THEN
    -- Shapes
    INSERT INTO shop_shapes (shop_id, name, slug, price_modifier, sort_order) VALUES
    (shop_id, 'Round', 'round', 0, 1),
    (shop_id, 'Square', 'square', 2, 2),
    (shop_id, 'Heart', 'heart', 5, 3);

    -- Sizes
    INSERT INTO shop_sizes (shop_id, weight_kg, price_multiplier, sort_order) VALUES
    (shop_id, 1, 1.0, 1),
    (shop_id, 2, 1.9, 2),
    (shop_id, 3, 2.7, 3);

    -- Fillings
    INSERT INTO shop_fillings (shop_id, name, price_modifier, sort_order) VALUES
    (shop_id, 'Chocolate', 3, 1),
    (shop_id, 'Vanilla', 0, 2),
    (shop_id, 'Strawberry', 2, 3),
    (shop_id, 'Red Velvet', 4, 4);

    -- Creams
    INSERT INTO shop_creams (shop_id, name, price_modifier, sort_order) VALUES
    (shop_id, 'Buttercream', 0, 1),
    (shop_id, 'Chocolate Cream', 3, 2),
    (shop_id, 'Vanilla Cream', 2, 3);

    -- Decorations
    INSERT INTO shop_decorations (shop_id, name, price, sort_order) VALUES
    (shop_id, 'Fresh Fruits', 8, 1),
    (shop_id, 'Berries', 6, 2),
    (shop_id, 'Chocolate Pieces', 5, 3),
    (shop_id, 'Custom Figures', 15, 4);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT seed_demo_shop();
