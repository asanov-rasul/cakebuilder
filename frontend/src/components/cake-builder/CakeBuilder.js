import React from 'react';
import useCakeStore from '../../store/cakeStore';
import StepShape from './StepShape';
import StepSize from './StepSize';
import StepFilling from './StepFilling';
import StepCream from './StepCream';
import StepDecorations from './StepDecorations';
import StepText from './StepText';
import Cake3DViewer from './Cake3DViewer';
import styles from './CakeBuilder.module.css';

const STEP_LABELS = ['Форма', 'Размер', 'Начинка', 'Крем', 'Украшения', 'Надпись'];
const STEP_EMOJIS = ['🔵', '⚖️', '🍫', '🧁', '🍓', '✍️'];
const BUILDER_STEPS = 6;

export default function CakeBuilder({ config }) {
  const { step, nextStep, prevStep, goToStep, isStepComplete, calculatePrice } = useCakeStore();

  const canNext = isStepComplete(step);
  const price = calculatePrice();
  const isLastBuilderStep = step === BUILDER_STEPS;

  const renderStep = () => {
    switch (step) {
      case 1: return <StepShape shapes={config.shapes} />;
      case 2: return <StepSize sizes={config.sizes} pricePerKg={config.shop.price_per_kg_base} />;
      case 3: return <StepFilling fillings={config.fillings} />;
      case 4: return <StepCream creams={config.creams} />;
      case 5: return <StepDecorations decorations={config.decorations} />;
      case 6: return <StepText />;
      default: return null;
    }
  };

  return (
    <div className={styles.wrap}>
      {/* Step nav pills */}
      <div className={styles.stepNav}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const isActive = n === step;
          const isDone = n < step;
          return (
            <button
              key={n}
              className={`${styles.stepPill} ${isActive ? styles.pillActive : ''} ${isDone ? styles.pillDone : ''}`}
              onClick={() => isDone && goToStep(n)}
              disabled={n > step}
            >
              <span className={styles.pillEmoji}>{isDone ? '✓' : STEP_EMOJIS[i]}</span>
              <span className={styles.pillLabel}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Two-column layout: 3D viewer | step content */}
      <div className={styles.mainLayout}>

        {/* LEFT: 3D cake viewer — sticky */}
        <div className={styles.viewerCol}>
          <Cake3DViewer />
          <div className={styles.priceTag}>
            <span className={styles.priceTagLabel}>Your cake</span>
            <span className={styles.priceTagValue}>${price.toFixed(2)} ТМТ</span>
          </div>
        </div>

        {/* RIGHT: step content + nav */}
        <div className={styles.stepCol}>
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>
                {STEP_EMOJIS[step - 1]}&nbsp;{STEP_LABELS[step - 1]}
              </h2>
              {step >= 4 && <span className={styles.optionalTag}>Optional</span>}
            </div>
            {renderStep()}
          </div>

          <div className={styles.navBtns}>
            {step > 1 && (
              <button className="btn btn-outline" onClick={prevStep}>← Back</button>
            )}
            <button
              className="btn btn-primary"
              onClick={nextStep}
              disabled={step <= 2 && !canNext}
            >
              {isLastBuilderStep ? '📋 Оформить заказ →' : 'Продолжить →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
