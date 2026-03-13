import React from 'react';
import useCakeStore from '../../store/cakeStore';
import styles from './Steps.module.css';

// ── Option card used across steps ──
function OptionCard({ emoji, label, sublabel, selected, onClick, badge }) {
  return (
    <button
      className={`${styles.optionCard} ${selected ? styles.selected : ''}`}
      onClick={onClick}
      type="button"
    >
      {badge && <span className={styles.cardBadge}>{badge}</span>}
      <span className={styles.cardEmoji}>{emoji}</span>
      <span className={styles.cardLabel}>{label}</span>
      {sublabel && <span className={styles.cardSublabel}>{sublabel}</span>}
      {selected && <span className={styles.checkMark}>✓</span>}
    </button>
  );
}

// ── Step 1: Shape ──
export function StepShape({ shapes }) {
  const { shape, setShape } = useCakeStore();
  const shapeEmojis = { round: '⭕', circle: '⭕', square: '⬛', heart: '❤️' };
  const shapePrices = { round: 'Included', square: '+$2', heart: '+$5' };

  return (
    <div className={styles.grid3}>
      {shapes.map((s) => (
        <OptionCard
          key={s.id}
          emoji={shapeEmojis[s.slug] || '🔵'}
          label={s.name}
          sublabel={parseFloat(s.price_modifier) > 0 ? `+$${s.price_modifier}` : 'Included'}
          selected={shape?.id === s.id}
          onClick={() => setShape(s)}
        />
      ))}
    </div>
  );
}

// ── Step 2: Size ──
export function StepSize({ sizes, pricePerKg }) {
  const { size, setSize, shape } = useCakeStore();
  const base = parseFloat(pricePerKg) || 15;

  return (
    <div>
      <p className={styles.stepHint}>Price is calculated as base rate × size × shape</p>
      <div className={styles.grid3}>
        {sizes.map((s) => {
          const price = (base * parseFloat(s.weight_kg) * parseFloat(s.price_multiplier)).toFixed(2);
          return (
            <OptionCard
              key={s.id}
              emoji={s.weight_kg <= 1 ? '🍰' : s.weight_kg <= 2 ? '🎂' : '🎆'}
              label={`${s.weight_kg} kg`}
              sublabel={`from $${price}`}
              selected={size?.id === s.id}
              onClick={() => setSize(s)}
              badge={s.weight_kg === 2 ? 'Popular' : null}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Step 3: Filling ──
export function StepFilling({ fillings }) {
  const { filling, setFilling } = useCakeStore();
  const fillingEmojis = { Chocolate: '🍫', Vanilla: '🤍', Strawberry: '🍓', 'Red Velvet': '❤️' };

  return (
    <div className={styles.grid2}>
      {fillings.map((f) => (
        <OptionCard
          key={f.id}
          emoji={fillingEmojis[f.name] || '🎂'}
          label={f.name}
          sublabel={parseFloat(f.price_modifier) > 0 ? `+$${f.price_modifier}` : 'Included'}
          selected={filling?.id === f.id}
          onClick={() => setFilling(f)}
        />
      ))}
    </div>
  );
}

// ── Step 4: Cream ──
export function StepCream({ creams }) {
  const { cream, setCream } = useCakeStore();
  const creamEmojis = { Buttercream: '🧈', 'Chocolate Cream': '🍫', 'Vanilla Cream': '🤍' };

  return (
    <div className={styles.grid2}>
      {creams.map((c) => (
        <OptionCard
          key={c.id}
          emoji={creamEmojis[c.name] || '🧁'}
          label={c.name}
          sublabel={parseFloat(c.price_modifier) > 0 ? `+$${c.price_modifier}` : 'Included'}
          selected={cream?.id === c.id}
          onClick={() => setCream(c)}
        />
      ))}
    </div>
  );
}

// ── Step 5: Decorations ──
export function StepDecorations({ decorations }) {
  const { decorations: selected, toggleDecoration } = useCakeStore();
  const decorEmojis = { 'Fresh Fruits': '🍊', Berries: '🫐', 'Chocolate Pieces': '🍫', 'Custom Figures': '🎭' };

  return (
    <div>
      <p className={styles.stepHint}>Pick as many as you like — or skip this step</p>
      <div className={styles.grid2}>
        {decorations.map((d) => {
          const isSelected = selected.some((s) => s.id === d.id);
          return (
            <OptionCard
              key={d.id}
              emoji={decorEmojis[d.name] || '✨'}
              label={d.name}
              sublabel={`+$${parseFloat(d.price).toFixed(2)}`}
              selected={isSelected}
              onClick={() => toggleDecoration(d)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Step 6: Text ──
export function StepText() {
  const { cakeText, setCakeText } = useCakeStore();

  return (
    <div className={styles.textStep}>
      <p className={styles.stepHint}>Add a personal message to your cake — or leave it blank</p>
      <div className={styles.textPreview}>
        <div className={styles.cakePreviewBg}>🎂</div>
        {cakeText && <div className={styles.cakeTextOverlay}>"{cakeText}"</div>}
      </div>
      <div className="form-group mt-4">
        <label className="form-label">Message on the cake</label>
        <input
          className="form-input"
          type="text"
          maxLength={40}
          placeholder='e.g. "Happy Birthday Sarah! 🎉"'
          value={cakeText}
          onChange={(e) => setCakeText(e.target.value)}
        />
        <span className={styles.charCount}>{cakeText.length}/40</span>
      </div>
    </div>
  );
}

export default { StepShape, StepSize, StepFilling, StepCream, StepDecorations, StepText };
