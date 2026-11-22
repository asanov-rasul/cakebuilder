-- 003: indexes, integrity constraints, soft delete, time zones.
-- Safe on the existing database: new CHECK/FK constraints are added
-- NOT VALID (they apply to new and updated rows and never fail on old ones),
-- and the one-shop-per-owner rule is only enforced if the data allows it.

-- -- Indexes ----------------------------------------------------------------
-- PostgreSQL does not index foreign keys by itself; every dashboard query
-- filters by shop_id.
CREATE INDEX IF NOT EXISTS orders_shop_created_idx ON orders (shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_shop_status_idx  ON orders (shop_id, status);
CREATE INDEX IF NOT EXISTS shop_shapes_shop_idx      ON shop_shapes (shop_id, sort_order);
CREATE INDEX IF NOT EXISTS shop_sizes_shop_idx       ON shop_sizes (shop_id, sort_order);
CREATE INDEX IF NOT EXISTS shop_fillings_shop_idx    ON shop_fillings (shop_id, sort_order);
CREATE INDEX IF NOT EXISTS shop_creams_shop_idx      ON shop_creams (shop_id, sort_order);
CREATE INDEX IF NOT EXISTS shop_decorations_shop_idx ON shop_decorations (shop_id, sort_order);

-- The code assumes one shop per owner. Make it a rule when the data allows;
-- otherwise keep a plain index and leave the duplicates for a human to fix.
DO $$
BEGIN
  IF NOT EXISTS (SELECT owner_id FROM shops WHERE owner_id IS NOT NULL GROUP BY owner_id HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS shops_owner_id_key ON shops (owner_id);
  ELSE
    RAISE NOTICE 'shops.owner_id has duplicates; unique index not created';
    CREATE INDEX IF NOT EXISTS shops_owner_id_idx ON shops (owner_id);
  END IF;
END $$;

-- -- Soft delete ------------------------------------------------------------
-- Deleting a shop used to erase all of its orders. Now a shop is marked
-- deleted and its owner disabled; order history stays.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP;

-- Hard deletes of shops/users with orders are now refused by the database.
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'orders'::regclass AND contype = 'f'
     AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'orders'::regclass AND attname = 'shop_id')]::smallint[];
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE orders ADD CONSTRAINT orders_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT;

  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid = 'shops'::regclass AND contype = 'f'
     AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'shops'::regclass AND attname = 'owner_id')]::smallint[];
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE shops DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE shops ADD CONSTRAINT shops_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;
END $$;

-- -- Value constraints (new/updated rows only) ------------------------------
ALTER TABLE shops            ADD CONSTRAINT shops_base_price_nonneg   CHECK (price_per_kg_base >= 0) NOT VALID;
ALTER TABLE shop_sizes       ADD CONSTRAINT shop_sizes_weight_pos     CHECK (weight_kg > 0) NOT VALID;
ALTER TABLE shop_sizes       ADD CONSTRAINT shop_sizes_multiplier_pos CHECK (price_multiplier > 0) NOT VALID;
ALTER TABLE shop_decorations ADD CONSTRAINT shop_decorations_price_nonneg CHECK (price >= 0) NOT VALID;
ALTER TABLE orders           ADD CONSTRAINT orders_total_nonneg       CHECK (total_price >= 0) NOT VALID;
ALTER TABLE shops ADD CONSTRAINT shops_subscription_plan_fkey
  FOREIGN KEY (subscription_plan) REFERENCES subscription_plans(slug) NOT VALID;

-- -- Time zones -------------------------------------------------------------
-- TIMESTAMP (no zone) was compared with NOW() and parsed by Node in the
-- server's local zone. Existing values are interpreted in the database's
-- TimeZone setting, which is how NOW() wrote them.
ALTER TABLE users  ALTER COLUMN created_at TYPE TIMESTAMPTZ, ALTER COLUMN updated_at TYPE TIMESTAMPTZ,
                   ALTER COLUMN disabled_at TYPE TIMESTAMPTZ;
ALTER TABLE shops  ALTER COLUMN created_at TYPE TIMESTAMPTZ, ALTER COLUMN updated_at TYPE TIMESTAMPTZ,
                   ALTER COLUMN trial_ends_at TYPE TIMESTAMPTZ, ALTER COLUMN subscription_ends_at TYPE TIMESTAMPTZ,
                   ALTER COLUMN deleted_at TYPE TIMESTAMPTZ;
ALTER TABLE orders ALTER COLUMN created_at TYPE TIMESTAMPTZ, ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- -- updated_at maintained by the database ----------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS shops_updated_at ON shops;
CREATE TRIGGER shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
