import React from 'react';
import useCakeStore from '../../store/cakeStore';
import styles from './Steps.module.css';
import cakeRoundImg from '../../assets/cake-round.png';
import cakeSquareImg from '../../assets/cake-square.png';
import cake1kg from '../../assets/cake-1kg.png';
import cake2kg from '../../assets/cake-2kg.png';
import cake3kg from '../../assets/cake-3kg.png';
import fillingChocolate from '../../assets/chocolate-filling.png';
import fillingRedVelvet from '../../assets/red-velvet-filling.png';
import fillingStrawberry from '../../assets/strawberry-filling.png';
import fillingVanilla from '../../assets/vanilla-filling.png';
import creamVanilla from '../../assets/vanilla-cream.png';
import creamChocolate from '../../assets/chocolate-cream.png';
import creamButter from '../../assets/butter-cream.png';
import decorBerries from '../../assets/berry-decor.png';
import decorChocolate from '../../assets/chocolate-decor.png';
import decorFruits from '../../assets/fruit-decor.png';

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
  const shapeEmojis = {
  round: <img src={cakeRoundImg} alt="Круг" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
  square: <img src={cakeSquareImg} alt="Круг" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
};
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
              emoji={
                s.weight_kg <= 1
                  ? <img src={cake1kg} alt="1 кг" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                  : s.weight_kg <= 2
                    ? <img src={cake2kg} alt="2 кг" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                    : <img src={cake3kg} alt="3 кг" style={{ width: 44, height: 44, objectFit: 'contain' }} />
              }
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
  const fillingEmojis = {
    Шоколад: <img src={fillingChocolate} alt="Шоколад" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
    Ваниль: <img src={fillingVanilla} alt="Ваниль" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
    Клубника: <img src={fillingStrawberry} alt="Клубника" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
    'Красный бархат': <img src={fillingRedVelvet} alt="Красный бархат" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
  };

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
  const creamEmojis = {
    'Сливочный крем': <img src={creamButter} alt="Сливочный крем" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
    'Шоколадный крем': <img src={creamChocolate} alt="Шоколадный крем" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
    'Ванильный крем': <img src={creamVanilla} alt="Ванильный крем" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
  };

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
  const decorEmojis = {
    'Свежие фрукты': <img src={decorFruits} alt="Свежие фрукты" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
    'Ягоды': <img src={decorBerries} alt="Ягоды" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
    'Шоколадные кусочки': <img src={decorChocolate} alt="Шоколадные кусочки" style={{ width: 44, height: 44, objectFit: 'contain' }} />,
  };

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
