import React from 'react';
import useCakeStore from '../../store/cakeStore';
import { useLang } from '../../i18n';
import styles from './Steps.module.css';

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

export function StepShape({ shapes }) {
  const { shape, setShape } = useCakeStore();
  const { t } = useLang();
  const shapeEmojis = { round: '⭕', circle: '⭕', square: '⬛', heart: '❤️' };

  return (
    <div className={styles.grid3}>
      {shapes.map((s) => (
        <OptionCard
          key={s.id}
          emoji={shapeEmojis[s.slug] || '🔵'}
          label={s.name}
          sublabel={parseFloat(s.price_modifier) > 0 ? `+${s.price_modifier} TMT` : t.builder.included}
          selected={shape?.id === s.id}
          onClick={() => setShape(s)}
        />
      ))}
    </div>
  );
}

export function StepSize({ sizes, pricePerKg }) {
  const { size, setSize } = useCakeStore();
  const { t } = useLang();
  const base = parseFloat(pricePerKg) || 15;

  return (
    <div>
      <p className={styles.stepHint}>{t.builder.sizeHint}</p>
      <div className={styles.grid3}>
        {sizes.map((s) => {
          const price = (base * parseFloat(s.weight_kg) * parseFloat(s.price_multiplier)).toFixed(2);
          return (
            <OptionCard
              key={s.id}
              emoji={s.weight_kg <= 1 ? '🍰' : s.weight_kg <= 2 ? '🎂' : '🎆'}
              label={`${s.weight_kg} kg`}
              sublabel={`${t.builder.from} ${price} TMT`}
              selected={size?.id === s.id}
              onClick={() => setSize(s)}
              badge={s.weight_kg === 2 ? t.builder.popular : null}
            />
          );
        })}
      </div>
    </div>
  );
}

export function StepFilling({ fillings }) {
  const { filling, setFilling } = useCakeStore();
  const { t } = useLang();
  const fillingEmojis = { Chocolate: '🍫', Vanilla: '🤍', Strawberry: '🍓', 'Red Velvet': '❤️' };

  return (
    <div className={styles.grid2}>
      {fillings.map((f) => (
        <OptionCard
          key={f.id}
          emoji={fillingEmojis[f.name] || '🎂'}
          label={f.name}
          sublabel={parseFloat(f.price_modifier) > 0 ? `+${f.price_modifier} TMT` : t.builder.included}
          selected={filling?.id === f.id}
          onClick={() => setFilling(f)}
        />
      ))}
    </div>
  );
}

export function StepCream({ creams }) {
  const { cream, setCream } = useCakeStore();
  const { t } = useLang();
  const creamEmojis = { Buttercream: '🧈', 'Chocolate Cream': '🍫', 'Vanilla Cream': '🤍' };

  return (
    <div className={styles.grid2}>
      {creams.map((c) => (
        <OptionCard
          key={c.id}
          emoji={creamEmojis[c.name] || '🧁'}
          label={c.name}
          sublabel={parseFloat(c.price_modifier) > 0 ? `+${c.price_modifier} TMT` : t.builder.included}
          selected={cream?.id === c.id}
          onClick={() => setCream(c)}
        />
      ))}
    </div>
  );
}

export function StepDecorations({ decorations }) {
  const { decorations: selected, toggleDecoration } = useCakeStore();
  const { t } = useLang();
  const decorEmojis = { 'Fresh Fruits': '🍊', Berries: '🫐', 'Chocolate Pieces': '🍫', 'Custom Figures': '🎭' };

  return (
    <div>
      <p className={styles.stepHint}>{t.builder.decorHint}</p>
      <div className={styles.grid2}>
        {decorations.map((d) => {
          const isSelected = selected.some((s) => s.id === d.id);
          return (
            <OptionCard
              key={d.id}
              emoji={decorEmojis[d.name] || '✨'}
              label={d.name}
              sublabel={`+${parseFloat(d.price).toFixed(2)} TMT`}
              selected={isSelected}
              onClick={() => toggleDecoration(d)}
            />
          );
        })}
      </div>
    </div>
  );
}

export function StepText() {
  const { cakeText, setCakeText } = useCakeStore();
  const { t } = useLang();

  return (
    <div className={styles.textStep}>
      <p className={styles.stepHint}>{t.builder.textHint}</p>
      <div className={styles.textPreview}>
        <div className={styles.cakePreviewBg}>🎂</div>
        {cakeText && <div className={styles.cakeTextOverlay}>"{cakeText}"</div>}
      </div>
      <div className="form-group mt-4">
        <label className="form-label">{t.builder.textLabel}</label>
        <input
          className="form-input"
          type="text"
          maxLength={40}
          placeholder={t.builder.textPlaceholder}
          value={cakeText}
          onChange={(e) => setCakeText(e.target.value)}
        />
        <span className={styles.charCount}>{cakeText.length}/40</span>
      </div>
    </div>
  );
}

export default { StepShape, StepSize, StepFilling, StepCream, StepDecorations, StepText };
