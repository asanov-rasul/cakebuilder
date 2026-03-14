import React from 'react';
import useCakeStore from '../../store/cakeStore';
import { useLang } from '../../i18n';
import styles from './CakeSummary.module.css';

export default function CakeSummary() {
  const { shape, size, filling, cream, decorations, cakeText, calculatePrice } = useCakeStore();
  const { t } = useLang();
  const B = t.builder;
  const price = calculatePrice();

  const rows = [
    { label: B.shapeLabel,   value: shape?.name,   emoji: '🔵' },
    { label: B.sizeLabel,    value: size ? `${size.weight_kg} kg` : null, emoji: '⚖️' },
    { label: B.fillingLabel, value: filling?.name,  emoji: '🍫' },
    { label: B.creamLabel,   value: cream?.name,    emoji: '🧁' },
    { label: B.decorLabel,   value: decorations.length ? decorations.map(d => d.name).join(', ') : null, emoji: '🍓' },
    { label: B.textSummaryLabel, value: cakeText || null, emoji: '✍️' },
  ].filter(r => r.value);

  if (!rows.length) return null;

  return (
    <div className={styles.summary}>
      <div className={styles.header}>
        <span>🎂</span>
        <span>{B.yourCakeSoFar}</span>
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
        <span>{t.common.total}</span>
        <span className={styles.totalPrice}>{price.toFixed(2)} TMT</span>
      </div>
    </div>
  );
}
