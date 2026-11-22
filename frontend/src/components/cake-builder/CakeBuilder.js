import React, { Suspense, lazy } from 'react';
import useCakeStore from '../../store/cakeStore';
import { StepShape, StepSize, StepFilling, StepCream, StepDecorations, StepText } from './Steps';
import { useLang } from '../../i18n';
import styles from './CakeBuilder.module.css';

// three.js is large; load it only when the builder is actually shown.
const Cake3DViewer = lazy(() => import('./Cake3DViewer'));

const STEP_EMOJIS = ['🔵', '⚖️', '🍫', '🧁', '🍓', '✍️'];
const BUILDER_STEPS = 6;

export default function CakeBuilder({ config }) {
  // Narrow selectors: typing the cake text no longer re-renders the whole builder.
  const step = useCakeStore((s) => s.step);
  const nextStep = useCakeStore((s) => s.nextStep);
  const prevStep = useCakeStore((s) => s.prevStep);
  const goToStep = useCakeStore((s) => s.goToStep);
  const stepComplete = useCakeStore((s) => s.isStepComplete(s.step));
  const price = useCakeStore((s) => s.calculatePrice());
  const { t } = useLang();
  const B = t.builder;

  // A step is only required when the shop offers options for it; the server
  // applies the same rule (backend/src/services/pricing.js).
  const STEP_OPTIONS = { 1: config.shapes, 2: config.sizes, 3: config.fillings, 4: config.creams };
  const stepHasOptions = (STEP_OPTIONS[step] || []).length > 0;
  const canNext = stepComplete || (step <= 4 && step !== 2 && !stepHasOptions);
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
      <div className={styles.stepNav}>
        {B.steps.map((label, i) => {
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

      <div className={styles.mainLayout}>
        <div className={styles.viewerCol}>
          <Suspense fallback={<div className={styles.viewerFallback}><div className="spinner" /></div>}>
            <Cake3DViewer />
          </Suspense>
          <div className={styles.priceTag}>
            <span className={styles.priceTagLabel}>{B.yourCake}</span>
            <span className={styles.priceTagValue}>{price.toFixed(2)} TMT</span>
          </div>
        </div>

        <div className={styles.stepCol}>
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <h2 className={styles.stepTitle}>
                {STEP_EMOJIS[step - 1]}&nbsp;{B.steps[step - 1]}
              </h2>
              {step >= 5 && <span className={styles.optionalTag}>{B.optional}</span>}
            </div>
            {renderStep()}
          </div>

          <div className={styles.navBtns}>
            {step > 1 && (
              <button className="btn btn-outline" onClick={prevStep}>{B.back}</button>
            )}
            <button
              className="btn btn-primary"
              onClick={nextStep}
              disabled={!canNext}
            >
              {isLastBuilderStep ? B.reviewOrder : B.continue}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
