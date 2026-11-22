// Local development only: creates the demo shop owner and the "sweetcake"
// shop with a menu. Refuses to run when NODE_ENV=production.
//
//   npm run seed:demo
//
// The owner password comes from DEMO_OWNER_PASSWORD, or is generated and
// printed once.
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const OWNER_EMAIL = 'owner@sweetcake.com';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed-demo is for local development only');
  }
  const password = process.env.DEMO_OWNER_PASSWORD || crypto.randomBytes(9).toString('base64url');

  await db.withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [OWNER_EMAIL]);
    if (existing.rows.length) {
      console.log(`${OWNER_EMAIL} already exists; nothing to do`);
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const user = (await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone)
       VALUES ($1, $2, 'shop_owner', 'Sarah Johnson', '+1 555 0101') RETURNING id`,
      [OWNER_EMAIL, hash]
    )).rows[0];

    const shop = (await client.query(
      `INSERT INTO shops (owner_id, name, slug, description, city, phone, email, price_per_kg_base)
       VALUES ($1, 'Sweet Cake', 'sweetcake', 'Premium custom cakes for every occasion',
               'New York', '+1 555 0101', 'hello@sweetcake.com', 15.00) RETURNING id`,
      [user.id]
    )).rows[0];

    // Names match the images and 3D colours the storefront looks up by name.
    await client.query(`INSERT INTO shop_shapes (shop_id, name, slug, price_modifier, sort_order) VALUES
      ($1,'Круглый','round',0,1),($1,'Квадратный','square',2,2)`, [shop.id]);
    await client.query(`INSERT INTO shop_sizes (shop_id, weight_kg, price_multiplier, sort_order) VALUES
      ($1,1,1.0,1),($1,2,1.9,2),($1,3,2.7,3)`, [shop.id]);
    await client.query(`INSERT INTO shop_fillings (shop_id, name, price_modifier, sort_order) VALUES
      ($1,'Шоколад',3,1),($1,'Ваниль',0,2),($1,'Клубника',2,3),($1,'Красный бархат',4,4)`, [shop.id]);
    await client.query(`INSERT INTO shop_creams (shop_id, name, price_modifier, sort_order) VALUES
      ($1,'Сливочный крем',0,1),($1,'Шоколадный крем',3,2),($1,'Ванильный крем',2,3)`, [shop.id]);
    await client.query(`INSERT INTO shop_decorations (shop_id, name, price, sort_order) VALUES
      ($1,'Свежие фрукты',8,1),($1,'Ягоды',6,2),($1,'Шоколадные кусочки',5,3),($1,'Custom Figures',15,4)`, [shop.id]);

    console.log(`Demo shop created: /shop/sweetcake`);
    console.log(`Owner login: ${OWNER_EMAIL}`);
    if (!process.env.DEMO_OWNER_PASSWORD) console.log(`Owner password (generated): ${password}`);
  });
}

main()
  .then(() => db.pool.end())
  .catch((err) => { console.error(err.message); db.pool.end(); process.exit(1); });
