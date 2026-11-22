// Server-side cake pricing. The order total is always computed here from the
// shop's own menu; whatever price the browser sends is only compared against
// it, never stored.
//
// Formula (must stay identical to calculatePrice in
// frontend/src/store/cakeStore.js, which only shows a preview):
//   base_per_kg * weight_kg * size_multiplier
//   + shape.price_modifier + filling.price_modifier + cream.price_modifier
//   + sum(decoration.price)
// rounded to 2 decimals.

class PricingError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toId = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

// Loads the active options of one menu table for the shop.
async function activeOptions(client, table, shopId) {
  return (await client.query(`SELECT * FROM ${table} WHERE shop_id=$1 AND is_active=true`, [shopId])).rows;
}

// Picks one required-or-optional option by id from the active list.
// `required` applies only when the shop actually offers that option type,
// so a shop that removed all creams can still take orders.
function pick(options, rawId, label) {
  const id = toId(rawId);
  if (Number.isNaN(id)) throw new PricingError(`Invalid ${label}`);
  if (id === null) {
    if (options.length) throw new PricingError(`Please choose a ${label}`);
    return null;
  }
  const found = options.find(o => o.id === id);
  if (!found) throw new PricingError(`This ${label} is not available`);
  return found;
}

// shop: row with id and price_per_kg_base.
// selection: { shape_id, size_id, filling_id, cream_id, decoration_ids }
async function priceOrder(client, shop, selection) {
  const [shapes, sizes, fillings, creams, decorations] = await Promise.all([
    activeOptions(client, 'shop_shapes', shop.id),
    activeOptions(client, 'shop_sizes', shop.id),
    activeOptions(client, 'shop_fillings', shop.id),
    activeOptions(client, 'shop_creams', shop.id),
    activeOptions(client, 'shop_decorations', shop.id),
  ]);

  const shape = pick(shapes, selection.shape_id, 'shape');
  const size = pick(sizes, selection.size_id, 'size');
  const filling = pick(fillings, selection.filling_id, 'filling');
  const cream = pick(creams, selection.cream_id, 'cream');
  if (!size) throw new PricingError('Please choose a size');

  const rawDecor = selection.decoration_ids ?? [];
  if (!Array.isArray(rawDecor) || rawDecor.length > 50) throw new PricingError('Invalid decorations');
  const decorIds = [...new Set(rawDecor.map(toId))];
  const chosenDecor = decorIds.map((id) => {
    const d = decorations.find(o => o.id === id);
    if (!d) throw new PricingError('This decoration is not available');
    return d;
  });

  const base = num(shop.price_per_kg_base) || 15;
  const sizePrice = base * num(size.weight_kg) * (num(size.price_multiplier) || 1);
  let total = sizePrice;
  if (shape) total += num(shape.price_modifier);
  if (filling) total += num(filling.price_modifier);
  if (cream) total += num(cream.price_modifier);
  chosenDecor.forEach((d) => { total += num(d.price); });
  total = Math.round(total * 100) / 100;

  const line = (o, price) => (o ? { id: o.id, name: o.name, price } : null);
  return {
    total,
    shape, size, filling, cream, decorations: chosenDecor,
    breakdown: {
      base_per_kg: base,
      size: { id: size.id, weight_kg: num(size.weight_kg), multiplier: num(size.price_multiplier) || 1, price: Math.round(sizePrice * 100) / 100 },
      shape: line(shape, shape && num(shape.price_modifier)),
      filling: line(filling, filling && num(filling.price_modifier)),
      cream: line(cream, cream && num(cream.price_modifier)),
      decorations: chosenDecor.map(d => ({ id: d.id, name: d.name, price: num(d.price) })),
      total,
    },
  };
}

module.exports = { priceOrder, PricingError };
