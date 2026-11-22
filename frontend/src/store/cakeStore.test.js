import { describe, it, expect, beforeEach } from 'vitest';
import useCakeStore from './cakeStore';

const config = {
  shop: { price_per_kg_base: '22.50' },
};

describe('calculatePrice (preview; must match backend/src/services/pricing.js)', () => {
  beforeEach(() => {
    useCakeStore.getState().reset();
    useCakeStore.getState().setShopConfig(config);
  });

  it('is 0 until a size is chosen', () => {
    expect(useCakeStore.getState().calculatePrice()).toBe(0);
  });

  it('base x weight x multiplier + modifiers + decorations, rounded to cents', () => {
    const s = useCakeStore.getState();
    s.setShape({ id: 1, price_modifier: '0.00' });
    s.setSize({ id: 2, weight_kg: '2.0', price_multiplier: '1.90' });
    s.setFilling({ id: 3, price_modifier: '3.00' });
    s.setCream({ id: 4, price_modifier: '3.00' });
    s.toggleDecoration({ id: 5, price: '8.00' });
    s.toggleDecoration({ id: 6, price: '6.00' });
    // 22.5 * 2 * 1.9 = 85.5; + 3 + 3 + 8 + 6 = 105.5
    expect(useCakeStore.getState().calculatePrice()).toBe(105.5);
  });

  it('toggling a decoration twice removes it', () => {
    const s = useCakeStore.getState();
    s.setSize({ id: 1, weight_kg: '1', price_multiplier: '1' });
    s.toggleDecoration({ id: 5, price: '8.00' });
    s.toggleDecoration({ id: 5, price: '8.00' });
    expect(useCakeStore.getState().calculatePrice()).toBe(22.5);
  });

  it('filling and cream are required steps', () => {
    const s = useCakeStore.getState();
    expect(s.isStepComplete(3)).toBe(false);
    s.setFilling({ id: 3 });
    expect(useCakeStore.getState().isStepComplete(3)).toBe(true);
  });
});
