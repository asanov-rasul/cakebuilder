import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang, LangSwitcher } from '../i18n';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const { t } = useLang();
  const L = t.landing;
  const canvasRef = useRef(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let frame, time = 0;
    const ctx = el.getContext('2d');
    const resize = () => { el.width = el.offsetWidth; el.height = el.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const draw = () => {
      frame = requestAnimationFrame(draw);
      time += 0.008;
      const { width: w, height: h } = el;
      ctx.clearRect(0, 0, w, h);
      const blobs = [
        { x: w*0.25 + Math.sin(time)*w*0.08,   y: h*0.35 + Math.cos(time*0.7)*h*0.06,  r: w*0.28, c: 'rgba(232,97,74,0.13)' },
        { x: w*0.75 + Math.cos(time*0.9)*w*0.06,y: h*0.55 + Math.sin(time*1.1)*h*0.08, r: w*0.22, c: 'rgba(212,165,116,0.12)' },
        { x: w*0.5  + Math.sin(time*1.3)*w*0.05,y: h*0.2  + Math.cos(time*0.8)*h*0.05, r: w*0.18, c: 'rgba(232,97,74,0.08)' },
      ];
      blobs.forEach(b => {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, b.c); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
      });
    };
    draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🍰</span>
            <span className={styles.logoText}>CakeBuilder</span>
          </div>
          <div className={styles.navActions}>
            <LangSwitcher />
            <Link to="/login" className="btn btn-ghost btn-sm">{t.nav.login}</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <canvas ref={canvasRef} className={styles.heroBgCanvas} />
        <div className={styles.container}>
          <div className={styles.heroBadge}>{L.badge}</div>
          <h1 className={styles.heroTitle}>
            {L.heroTitle}<br />
            <em>{L.heroTitleEm}</em>
          </h1>
          <p className={styles.heroSubtitle}>{L.heroSub}</p>
          <div className={styles.heroCtas}>
            <Link to="/shop/sweetcake" className="btn btn-primary btn-xl">{L.demoBtn}</Link>
          </div>

          <div className={styles.heroPreview}>
            <div className={styles.previewBar}>
              <div className={styles.previewDots}><span /><span /><span /></div>
              <div className={styles.previewUrl}>cakebuilder.app/shop/sweetcake</div>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewLeft}>
                <div className={styles.preview3dBox}>
                  <div className={styles.preview3dCake}>🎂</div>
                  <div className={styles.preview3dLabel}>3D · Drag to rotate</div>
                </div>
              </div>
              <div className={styles.previewRight}>
                <div className={styles.previewStep}>
                  <div className={styles.previewStepLabel}>{L.step2of6}</div>
                  <div className={styles.previewOptions}>
                    <div className={`${styles.previewOption} ${styles.selected}`}>🍓 Фрукты</div>
                    <div className={styles.previewOption}>🫐 Ягоды</div>
                    <div className={styles.previewOption}>🍫 Шоколад</div>
                  </div>
                </div>
                <div className={styles.previewPrice}>
                  <span>{L.total}</span>
                  <strong>$47.50</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="benefits">
        <div className={styles.container}>
          <div className={styles.sectionLabel}>{L.benefitsLabel}</div>
          <h2 className={styles.sectionTitle}>{L.benefitsTitle}</h2>
          <div className={styles.benefitsGrid}>
            {L.benefits.map(b => (
              <div key={b.title} className={styles.benefitCard}>
                <div className={styles.benefitIcon}>{b.icon}</div>
                <h3 className={styles.benefitTitle}>{b.title}</h3>
                <p className={styles.benefitDesc}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech */}
      <section className={styles.section} id="tech">
        <div className={styles.container}>
          <div className={styles.sectionLabel}>{L.techLabel}</div>
          <h2 className={styles.sectionTitle}>{L.techTitle}</h2>
          <div className={styles.techLayout}>
            <div className={styles.techPoints}>
              {L.techPoints.map(p => (
                <div key={p.label} className={styles.techPoint}>
                  <div className={styles.techDot} />
                  <div>
                    <div className={styles.techLabel}>{p.label}</div>
                    <div className={styles.techDetail}>{p.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.techVisual}>
              <div className={styles.techScreen}>
                <div className={styles.techScreenInner}>
                  <div className={styles.techCakeEmoji}>🎂</div>
                  <div className={styles.techScreenLines}>
                    <div className={styles.techLine} style={{ width: '80%' }} />
                    <div className={styles.techLine} style={{ width: '60%' }} />
                    <div className={styles.techLine} style={{ width: '70%' }} />
                  </div>
                </div>
                <div className={styles.techScreenLabel}>WebGL · Three.js · PBR Materials</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaBox}>
            <h2 className={styles.ctaTitle}>{L.ctaTitle}</h2>
            <p className={styles.ctaDesc}>{L.ctaDesc}</p>
            <Link to="/shop/sweetcake" className="btn btn-primary btn-xl">{L.openDemo}</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.footerLogo}><span>🍰</span> CakeBuilder</div>
            <p className={styles.footerCopy}>{L.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
