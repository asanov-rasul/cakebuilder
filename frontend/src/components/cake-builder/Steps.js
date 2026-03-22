import React from 'react';
import useCakeStore from '../../store/cakeStore';
import styles from './Steps.module.css';

// Русские названия по slug/name
const SHAPE_NAMES   = { round: 'Круглый', circle: 'Круглый', square: 'Квадратный' };
const FILLING_NAMES = { Chocolate: 'Шоколад', Vanilla: 'Ваниль', Strawberry: 'Клубника', 'Red Velvet': 'Красный бархат' };
const CREAM_NAMES   = { Buttercream: 'Сливочный крем', 'Chocolate Cream': 'Шоколадный крем', 'Vanilla Cream': 'Ванильный крем' };
const DECO_NAMES    = { 'Fresh Fruits': 'Свежие фрукты', Berries: 'Ягоды', 'Chocolate Pieces': 'Кусочки шоколада', 'Custom Figures': 'Фигурки' };

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

// Шаг 1: Форма — только круг и квадрат
export function StepShape({ shapes }) {
  const { shape, setShape } = useCakeStore();
  const shapeEmojis = { round: `<svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- тень -->
  <ellipse cx="32" cy="50" rx="20" ry="6" fill="#000" opacity="0.1"/>
  
  <!-- нижний слой -->
  <ellipse cx="32" cy="40" rx="20" ry="8" fill="#D28B5C"/>
  <rect x="12" y="30" width="40" height="10" fill="#D28B5C"/>
  
  <!-- крем -->
  <ellipse cx="32" cy="30" rx="20" ry="8" fill="#FFF3E0"/>
  <path d="M12 30 Q16 35 20 30 T28 30 T36 30 T44 30 T52 30" fill="#FFF3E0"/>
  
  <!-- верх -->
  <ellipse cx="32" cy="24" rx="16" ry="6" fill="#FFB6C1"/>
  
  <!-- свечка -->
  <rect x="30" y="10" width="4" height="10" fill="#6C63FF"/>
  <ellipse cx="32" cy="8" rx="2" ry="3" fill="#FFA500"/>
</svg>`, square: `<svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- тень -->
  <rect x="16" y="50" width="32" height="6" rx="2" fill="#000" opacity="0.1"/>

  <!-- нижний слой (бисквит) -->
  <rect x="12" y="32" width="40" height="14" rx="2" fill="#D28B5C"/>

  <!-- крем между слоями -->
  <rect x="12" y="28" width="40" height="6" rx="2" fill="#FFF3E0"/>

  <!-- верхний слой -->
  <rect x="16" y="20" width="32" height="10" rx="2" fill="#FFB6C1"/>

  <!-- подтеки крема (сделаны угловатыми) -->
  <path d="M16 30 L20 34 L24 30 L28 34 L32 30 L36 34 L40 30 L44 34 L48 30 L48 28 L16 28 Z" fill="#FFF3E0"/>

  <!-- свечка -->
  <rect x="30" y="10" width="4" height="10" fill="#6C63FF"/>
  <polygon points="32,6 34,10 30,10" fill="#FFA500"/>
</svg>` };
  const allowed = shapes.filter(s => s.slug === 'round' || s.slug === 'square');

  return (
    <div className={styles.grid3}>
      {allowed.map((s) => (
        <OptionCard
          key={s.id}
          emoji={shapeEmojis[s.slug] || '🔵'}
          label={SHAPE_NAMES[s.slug] || s.name}
          sublabel={parseFloat(s.price_modifier) > 0 ? `+${s.price_modifier} ТМТ` : 'Включено'}
          selected={shape?.id === s.id}
          onClick={() => setShape(s)}
        />
      ))}
    </div>
  );
}

// Шаг 2: Размер
export function StepSize({ sizes, pricePerKg }) {
  const { size, setSize } = useCakeStore();
  const base = parseFloat(pricePerKg) || 15;

  return (
    <div>
      <p className={styles.stepHint}>Цена = базовая ставка × размер × форма</p>
      <div className={styles.grid3}>
        {sizes.map((s) => {
          const price = (base * parseFloat(s.weight_kg) * parseFloat(s.price_multiplier)).toFixed(2);
          return (
            <OptionCard
              key={s.id}
              emoji={s.weight_kg <= 1 ? '🍰' : s.weight_kg <= 2 ? '🎂' : '🎆'}
              label={`${s.weight_kg} кг`}
              sublabel={`от ${price} ТМТ`}
              selected={size?.id === s.id}
              onClick={() => setSize(s)}
              badge={s.weight_kg === 2 ? 'Популярное' : null}
            />
          );
        })}
      </div>
    </div>
  );
}

// Шаг 3: Начинка
export function StepFilling({ fillings }) {
  const { filling, setFilling } = useCakeStore();
  const fillingEmojis = { Chocolate: '🍫', Vanilla: '🤍', Strawberry: '🍓', 'Red Velvet': '❤️' };

  return (
    <div className={styles.grid2}>
      {fillings.map((f) => (
        <OptionCard
          key={f.id}
          emoji={fillingEmojis[f.name] || '🎂'}
          label={FILLING_NAMES[f.name] || f.name}
          sublabel={parseFloat(f.price_modifier) > 0 ? `+${f.price_modifier} ТМТ` : 'Включено'}
          selected={filling?.id === f.id}
          onClick={() => setFilling(f)}
        />
      ))}
    </div>
  );
}

// Шаг 4: Крем
export function StepCream({ creams }) {
  const { cream, setCream } = useCakeStore();
  const creamEmojis = { Buttercream: '🧈', 'Chocolate Cream': '🍫', 'Vanilla Cream': '🤍' };

  return (
    <div className={styles.grid2}>
      {creams.map((c) => (
        <OptionCard
          key={c.id}
          emoji={creamEmojis[c.name] || '🧁'}
          label={CREAM_NAMES[c.name] || c.name}
          sublabel={parseFloat(c.price_modifier) > 0 ? `+${c.price_modifier} ТМТ` : 'Включено'}
          selected={cream?.id === c.id}
          onClick={() => setCream(c)}
        />
      ))}
    </div>
  );
}

// Шаг 5: Украшения
export function StepDecorations({ decorations }) {
  const { decorations: selected, toggleDecoration } = useCakeStore();
  const decorEmojis = { 'Fresh Fruits': '🍊', Berries: '🫐', 'Chocolate Pieces': '🍫', 'Custom Figures': '🎭' };

  return (
    <div>
      <p className={styles.stepHint}>Выберите несколько или пропустите этот шаг</p>
      <div className={styles.grid2}>
        {decorations.map((d) => {
          const isSelected = selected.some((s) => s.id === d.id);
          return (
            <OptionCard
              key={d.id}
              emoji={decorEmojis[d.name] || '✨'}
              label={DECO_NAMES[d.name] || d.name}
              sublabel={`+${parseFloat(d.price).toFixed(2)} ТМТ`}
              selected={isSelected}
              onClick={() => toggleDecoration(d)}
            />
          );
        })}
      </div>
    </div>
  );
}

// Шаг 6: Надпись
export function StepText() {
  const { cakeText, setCakeText } = useCakeStore();

  return (
    <div className={styles.textStep}>
      <p className={styles.stepHint}>Добавьте надпись на торт — или оставьте пустым</p>
      <div className={styles.textPreview}>
        <div className={styles.cakePreviewBg}>🎂</div>
        {cakeText && <div className={styles.cakeTextOverlay}>"{cakeText}"</div>}
      </div>
      <div className="form-group mt-4">
        <label className="form-label">Надпись на торте</label>
        <input
          className="form-input"
          type="text"
          maxLength={40}
          placeholder='Например: "С Днём Рождения! 🎉"'
          value={cakeText}
          onChange={(e) => setCakeText(e.target.value)}
        />
        <span className={styles.charCount}>{cakeText.length}/40</span>
      </div>
    </div>
  );
}

export default { StepShape, StepSize, StepFilling, StepCream, StepDecorations, StepText };
