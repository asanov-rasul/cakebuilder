import React from 'react';
import useCakeStore from '../../store/cakeStore';
import { useLang } from '../../i18n';
import { presetImage, itemLabel } from './menuPresets';
import styles from './Steps.module.css';
import cake1kg from '../../assets/cake-1kg.png';
import cake2kg from '../../assets/cake-2kg.png';
import cake3kg from '../../assets/cake-3kg.png';

const CURRENCY = 'TMT';
const IMG_STYLE = { width: 50, height: 50, objectFit: 'contain' };

function OptionCard({ emoji, label, sublabel, selected, onClick, badge }) {
  return (
    <button
      className={`${styles.optionCard} ${selected ? styles.selected : ''}`}
      onClick={onClick}
      type="button"
      aria-pressed={selected}
    >
      {badge && <span className={styles.cardBadge}>{badge}</span>}
      <span className={styles.cardEmoji}>{emoji}</span>
      <span className={styles.cardLabel}>{label}</span>
      {sublabel && <span className={styles.cardSublabel}>{sublabel}</span>}
      {selected && <span className={styles.checkMark}>✓</span>}
    </button>
  );
}

const icon = (type, item, label, fallback) => {
  const src = presetImage(type, item);
  return src ? <img src={src} alt={label} style={IMG_STYLE} /> : fallback;
};

const modifierLabel = (value, B) =>
  parseFloat(value) > 0 ? `+${parseFloat(value).toFixed(2)} ${CURRENCY}` : B.included;

// Shared single-choice step (shape, filling, cream).
function SingleChoice({ type, items, value, onChange, fallback, grid }) {
  const { t } = useLang();
  const B = t.builder;
  return (
    <div className={grid}>
      {items.map((item) => {
        const label = itemLabel(type, item, B.presets);
        return (
          <OptionCard
            key={item.id}
            emoji={icon(type, item, label, fallback)}
            label={label}
            sublabel={modifierLabel(item.price_modifier, B)}
            selected={value?.id === item.id}
            onClick={() => onChange(item)}
          />
        );
      })}
    </div>
  );
}

// Step 1: shape. Every active shape the shop offers is shown; the 3D view
// draws "square" shapes as square and everything else as round.
export function StepShape({ shapes }) {
  const shape = useCakeStore((s) => s.shape);
  const setShape = useCakeStore((s) => s.setShape);
  return <SingleChoice type="shapes" items={shapes} value={shape} onChange={setShape} fallback="🎂" grid={styles.grid3} />;
}

// Step 2: size
export function StepSize({ sizes, pricePerKg }) {
  const size = useCakeStore((s) => s.size);
  const setSize = useCakeStore((s) => s.setSize);
  const { t } = useLang();
  const B = t.builder;
  const base = parseFloat(pricePerKg) || 15;

  return (
    <div>
      <p className={styles.stepHint}>{B.sizeHint}</p>
      <div className={styles.grid3}>
        {sizes.map((s) => {
          const kg = parseFloat(s.weight_kg);
          const price = (base * kg * (parseFloat(s.price_multiplier) || 1)).toFixed(2);
          const img = kg <= 1 ? cake1kg : kg <= 2 ? cake2kg : cake3kg;
          return (
            <OptionCard
              key={s.id}
              emoji={<img src={img} alt={`${kg} ${B.kg}`} style={IMG_STYLE} />}
              label={`${kg} ${B.kg}`}
              sublabel={`${B.from} ${price} ${CURRENCY}`}
              selected={size?.id === s.id}
              onClick={() => setSize(s)}
              badge={kg === 2 ? B.popular : null}
            />
          );
        })}
      </div>
    </div>
  );
}

// Step 3: filling
export function StepFilling({ fillings }) {
  const filling = useCakeStore((s) => s.filling);
  const setFilling = useCakeStore((s) => s.setFilling);
  return <SingleChoice type="fillings" items={fillings} value={filling} onChange={setFilling} fallback="🎂" grid={styles.grid2} />;
}

// Step 4: cream
export function StepCream({ creams }) {
  const cream = useCakeStore((s) => s.cream);
  const setCream = useCakeStore((s) => s.setCream);
  return <SingleChoice type="creams" items={creams} value={cream} onChange={setCream} fallback="🧁" grid={styles.grid2} />;
}

// Step 5: decorations (multiple choice, optional)
export function StepDecorations({ decorations }) {
  const selected = useCakeStore((s) => s.decorations);
  const toggleDecoration = useCakeStore((s) => s.toggleDecoration);
  const { t } = useLang();
  const B = t.builder;

  return (
    <div>
      <p className={styles.stepHint}>{B.decorHint}</p>
      <div className={styles.grid2}>
        {decorations.map((d) => {
          const label = itemLabel('decorations', d, B.presets);
          return (
            <OptionCard
              key={d.id}
              emoji={icon('decorations', d, label, '✨')}
              label={label}
              sublabel={`+${parseFloat(d.price).toFixed(2)} ${CURRENCY}`}
              selected={selected.some((s) => s.id === d.id)}
              onClick={() => toggleDecoration(d)}
            />
          );
        })}
      </div>
    </div>
  );
}

// Step 6: text on the cake (optional)
export function StepText() {
  const cakeText = useCakeStore((s) => s.cakeText);
  const setCakeText = useCakeStore((s) => s.setCakeText);
  const { t } = useLang();
  const B = t.builder;

  return (
    <div className={styles.textStep}>
      <p className={styles.stepHint}>{B.textHint}</p>
      <div className={styles.textPreview}>
        <div className={styles.cakePreviewBg}>🎂</div>
        {cakeText && <div className={styles.cakeTextOverlay}>"{cakeText}"</div>}
      </div>
      <div className="form-group mt-4">
        <label className="form-label" htmlFor="cake-text">{B.textLabel}</label>
        <input
          id="cake-text"
          className="form-input"
          type="text"
          maxLength={40}
          placeholder={B.textPlaceholder}
          value={cakeText}
          onChange={(e) => setCakeText(e.target.value)}
        />
        <span className={styles.charCount}>{cakeText.length}/40</span>
      </div>
    </div>
  );
}
