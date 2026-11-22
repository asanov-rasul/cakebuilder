-- 002: server-side pricing.
-- Orders now keep a breakdown of how the server computed total_price
-- (option ids, unit prices) so the amount can be audited later.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_breakdown JSONB;

-- A bug in PUT /api/shops/my wrote NULL into price_per_kg_base whenever the
-- profile page was saved. The storefront already treated NULL as 15.00, so
-- setting those rows to 15.00 keeps the prices customers currently see.
-- Shop owners who had a different base price must re-enter it in "Pricing".
UPDATE shops SET price_per_kg_base = 15.00 WHERE price_per_kg_base IS NULL;
ALTER TABLE shops ALTER COLUMN price_per_kg_base SET DEFAULT 15.00;
ALTER TABLE shops ALTER COLUMN price_per_kg_base SET NOT NULL;
