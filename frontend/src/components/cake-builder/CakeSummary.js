import React from 'react';
import useCakeStore from '../../store/cakeStore';
import styles from './CakeSummary.module.css';

export default function CakeSummary() {
  const { shape, size, filling, cream, decorations, cakeText, calculatePrice } = useCakeStore();
  const price = calculatePrice();

  const rows = [
    { label: 'Shape', value: shape?.name, emoji: '🔵' },
    { label: 'Size', value: size ? `${size.weight_kg} kg` : null, emoji: '⚖️' },
    { label: 'Filling', value: filling?.name, emoji: '🍫' },
    { label: 'Cream', value: cream?.name, emoji: '🧁' },
    { label: 'Decorations', value: decorations.length ? decorations.map(d => d.name).join(', ') : null, emoji: '🍓' },
    { label: 'Text', value: cakeText || null, emoji: '✍️' },
  ].filter(r => r.value);

  if (!rows.length) return null;

  return (
    <div className={styles.summary}>
      <div className={styles.header}>
        <span>🎂</span>
        <span>Your cake so far</span>
      </div>
      <div className={styles.rows}>
        {rows.map(r => (
          <div key={r.label} className={styles.row}>
            <span className={styles.rowEmoji}>{r.emoji}</span>
            <span className={styles.rowLabel}>{r.label}</span>
            <span className={styles.rowValue}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className={styles.total}>
        <span>Total</span>
        <span className={styles.totalPrice}>${price.toFixed(2)}</span>
      </div>
    </div>
  );
}
