// Recognises the standard menu items (whatever language the shop used for
// their names) so the builder can show the right picture and a translated
// label. Custom items the owner added keep their own name and a generic icon.
import cakeRoundImg from '../../assets/cake-round.png';
import cakeSquareImg from '../../assets/cake-square.png';
import fillingChocolate from '../../assets/chocolate-filling.png';
import fillingRedVelvet from '../../assets/red-velvet-filling.png';
import fillingStrawberry from '../../assets/strawberry-filling.png';
import fillingVanilla from '../../assets/vanilla-filling.png';
import creamVanilla from '../../assets/vanilla-cream.png';
import creamChocolate from '../../assets/chocolate-cream.png';
import creamButter from '../../assets/butter-cream.png';
import decorBerries from '../../assets/berries-decor.png';
import decorChocolate from '../../assets/chocolate-decor.png';
import decorFruits from '../../assets/fruits-decor.png';

// Order matters: the first preset whose alias occurs in the name wins
// ("Chocolate Cream" must hit chocolate_cream before chocolate).
const ALIASES = {
  fillings: [
    ['red_velvet', ['red velvet', 'красный бархат', 'gyzyl barhat']],
    ['strawberry', ['strawberr', 'клубник', 'ýertudana']],
    ['chocolate', ['chocolate', 'шоколад', 'şokolad']],
    ['vanilla', ['vanilla', 'ванил', 'wanil']],
  ],
  creams: [
    ['chocolate_cream', ['chocolate', 'шоколад', 'şokolad']],
    ['vanilla_cream', ['vanilla', 'ванил', 'wanil']],
    ['buttercream', ['butter', 'сливоч', 'kaýmak']],
  ],
  decorations: [
    ['fruits', ['fruit', 'фрукт', 'miwe']],
    ['berries', ['berr', 'ягод']],
    ['chocolate_pieces', ['chocolate', 'шоколад', 'şokolad']],
    ['figures', ['figur', 'фигур', 'şekil']],
  ],
};

const IMAGES = {
  round: cakeRoundImg, square: cakeSquareImg,
  chocolate: fillingChocolate, vanilla: fillingVanilla, strawberry: fillingStrawberry, red_velvet: fillingRedVelvet,
  buttercream: creamButter, chocolate_cream: creamChocolate, vanilla_cream: creamVanilla,
  fruits: decorFruits, berries: decorBerries, chocolate_pieces: decorChocolate,
};

// Names the platform itself ever seeded (any language). Only these get
// translated; a name the owner typed is shown exactly as typed.
const DEFAULT_NAMES = new Set([
  'round', 'square', 'круглый', 'квадратный',
  'chocolate', 'vanilla', 'strawberry', 'red velvet', 'шоколад', 'ваниль', 'клубника', 'красный бархат',
  'buttercream', 'chocolate cream', 'vanilla cream', 'сливочный крем', 'шоколадный крем', 'ванильный крем',
  'fresh fruits', 'berries', 'chocolate pieces', 'custom figures', 'свежие фрукты', 'ягоды',
  'шоколадные кусочки', 'кусочки шоколада', 'фигурки',
]);

export function presetKey(type, item) {
  if (!item) return null;
  if (type === 'shapes') return item.slug === 'square' ? 'square' : item.slug === 'round' ? 'round' : null;
  const name = (item.name || '').toLowerCase();
  const hit = (ALIASES[type] || []).find(([, aliases]) => aliases.some(a => name.includes(a)));
  return hit ? hit[0] : null;
}

export function presetImage(type, item) {
  return IMAGES[presetKey(type, item)] || null;
}

// Label in the current language for standard items, owner's name otherwise.
export function itemLabel(type, item, presets) {
  const key = presetKey(type, item);
  const isDefault = DEFAULT_NAMES.has((item?.name || '').trim().toLowerCase());
  return key && isDefault && presets?.[key] ? presets[key] : item?.name;
}
