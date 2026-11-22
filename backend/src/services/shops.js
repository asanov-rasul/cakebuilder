// Shop helpers shared by the auth, admin and order routes.

// Default menu for a freshly created shop. Runs on the caller's client so it
// can be part of the same transaction that creates the shop. Names match the
// pictures and 3D colours the storefront knows (it also understands the
// English names used by older shops).
async function seedDefaultMenu(client, shopId) {
  await client.query(`INSERT INTO shop_shapes (shop_id, name, slug, price_modifier, sort_order) VALUES
    ($1,'Круглый','round',0,1),($1,'Квадратный','square',2,2)`, [shopId]);
  await client.query(`INSERT INTO shop_sizes (shop_id, weight_kg, price_multiplier, sort_order) VALUES
    ($1,1,1.0,1),($1,2,1.9,2),($1,3,2.7,3)`, [shopId]);
  await client.query(`INSERT INTO shop_fillings (shop_id, name, price_modifier, sort_order) VALUES
    ($1,'Шоколад',3,1),($1,'Ваниль',0,2),($1,'Клубника',2,3),($1,'Красный бархат',4,4)`, [shopId]);
  await client.query(`INSERT INTO shop_creams (shop_id, name, price_modifier, sort_order) VALUES
    ($1,'Сливочный крем',0,1),($1,'Шоколадный крем',3,2),($1,'Ванильный крем',2,3)`, [shopId]);
  await client.query(`INSERT INTO shop_decorations (shop_id, name, price, sort_order) VALUES
    ($1,'Свежие фрукты',8,1),($1,'Ягоды',6,2),($1,'Шоколадные кусочки',5,3),($1,'Фигурки',15,4)`, [shopId]);
}

// Whether a shop may show its storefront and accept orders.
// `shop` needs is_active, subscription_status and trial_ends_at.
// Returns null when the shop is open, otherwise the error message to send.
function shopClosedReason(shop, now = new Date()) {
  if (!shop.is_active || shop.deleted_at) return 'Shop is inactive';
  if (shop.subscription_status === 'inactive' || shop.subscription_status === 'expired') {
    return 'Shop is inactive';
  }
  if (shop.subscription_status === 'trial' && shop.trial_ends_at && new Date(shop.trial_ends_at) < now) {
    return 'Shop subscription expired';
  }
  return null;
}

// Orders used this calendar month against the plan's max_orders
// (subscription_plans; NULL = unlimited). `db` is anything with .query.
async function planUsage(db, shop) {
  const [plan, used] = await Promise.all([
    db.query('SELECT max_orders FROM subscription_plans WHERE slug=$1', [shop.subscription_plan || 'starter']),
    db.query(
      "SELECT COUNT(*)::int AS c FROM orders WHERE shop_id=$1 AND created_at >= date_trunc('month', NOW())",
      [shop.id]
    ),
  ]);
  const limit = plan.rows[0]?.max_orders ?? null;
  return { plan: shop.subscription_plan || 'starter', used: used.rows[0].c, limit };
}

module.exports = { seedDefaultMenu, shopClosedReason, planUsage };
