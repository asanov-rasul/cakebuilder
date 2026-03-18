import React from 'react';
import useCakeStore from '../../store/cakeStore';
import styles from './CakeSummary.module.css';

export default function CakeSummary() {
  const { shape, size, filling, cream, decorations, cakeText, calculatePrice } = useCakeStore();
  const price = calculatePrice();

  const rows = [
    { label: 'Форма', value: shape?.name, emoji: '🔵' },
    { label: 'Размер', value: size ? `${size.weight_kg} кг` : null, emoji: '⚖️' },
    { label: 'Начинка', value: filling?.name, emoji: '🍫' },
    { label: 'Крем', value: cream?.name, emoji: '🧁' },
    { label: 'Украшения', value: decorations.length ? decorations.map(d => d.name).join(', ') : null, emoji: '🍓' },
    { label: 'Надпись', value: cakeText || null, emoji: '✍️' },
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
