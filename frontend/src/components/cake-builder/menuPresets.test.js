import { describe, it, expect } from 'vitest';
import { presetKey, presetImage, itemLabel } from './menuPresets';
import en from '../../i18n/en';
import ru from '../../i18n/ru';

describe('menu presets', () => {
  it('recognises standard items in English, Russian and Turkmen', () => {
    expect(presetKey('fillings', { name: 'Chocolate' })).toBe('chocolate');
    expect(presetKey('fillings', { name: 'Шоколад' })).toBe('chocolate');
    expect(presetKey('fillings', { name: 'Şokolad' })).toBe('chocolate');
    expect(presetKey('creams', { name: 'Chocolate Cream' })).toBe('chocolate_cream');
    expect(presetKey('creams', { name: 'Buttercream' })).toBe('buttercream');
    expect(presetKey('decorations', { name: 'Свежие фрукты' })).toBe('fruits');
  });

  it('shapes are recognised by their type, not their name', () => {
    expect(presetKey('shapes', { slug: 'square', name: 'Квадрат XL' })).toBe('square');
    expect(presetKey('shapes', { slug: 'heart', name: 'Heart' })).toBe(null);
  });

  it('gives an image for standard items (new shops used to get none)', () => {
    expect(presetImage('fillings', { name: 'Chocolate' })).toBeTruthy();
    expect(presetImage('fillings', { name: 'Mango' })).toBe(null);
  });

  it('translates default names but keeps names the owner typed', () => {
    expect(itemLabel('fillings', { name: 'Chocolate' }, ru.builder.presets)).toBe('Шоколад');
    expect(itemLabel('fillings', { name: 'Шоколад' }, en.builder.presets)).toBe('Chocolate');
    expect(itemLabel('fillings', { name: 'Бельгийский шоколад' }, en.builder.presets)).toBe('Бельгийский шоколад');
  });
});
