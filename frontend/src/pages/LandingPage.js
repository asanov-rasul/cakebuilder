import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';

const BENEFITS = [
  {
    icon: '🎯',
    title: 'Меньше ошибок в заказах',
    desc: 'Клиент видит точную 3D модель своего торта до оформления заказа — форму, крем, украшения. Никаких недопониманий по телефону.',
  },
  {
    icon: '⏱️',
    title: 'Быстрее принятие решения',
    desc: 'Визуализация в реальном времени ускоряет выбор. Клиент не откладывает заказ — он видит результат прямо сейчас.',
  },
  {
    icon: '💰',
    title: 'Выше средний чек',
    desc: 'Когда клиент видит торт с украшениями в 3D, он охотнее добавляет фрукты, посыпки и другие опции.',
  },
  {
    icon: '📱',
    title: 'Работает на любом устройстве',
    desc: '3D рендер запускается прямо в браузере — без приложений, без загрузок. На телефоне, планшете, компьютере.',
  },
  {
    icon: '🔄',
    title: 'Обновляется мгновенно',
    desc: 'Каждый шаг выбора — форма, начинка, крем, текст — сразу отражается на модели. Никаких задержек.',
  },
  {
    icon: '❤️',
    title: 'Запоминающийся опыт',
    desc: 'Клиенты возвращаются и рекомендуют магазин другим — потому что процесс заказа был интересным и наглядным.',
  },
];

const TECH_POINTS = [
  { label: 'Реалистичные материалы', detail: 'PBR-шейдеры, тени, ACES tone mapping — торт выглядит как фото' },
  { label: 'Форма сердце, круг, квадрат', detail: 'Параметрические геометрии с органическими смещениями вершин' },
  { label: 'Живые свечи', detail: 'Анимированное пламя с точечным светом и мерцанием' },
  { label: 'Реальные фрукты', detail: 'Клубника с семечками, дольки апельсина, черника с короной' },
  { label: 'Надпись на торте', detail: 'Canvas-текстура с каллиграфическим шрифтом прямо на поверхности крема' },
  { label: 'Вращение и drag', detail: 'Плавное вращение мышью или пальцем, автоспин' },
];

export default function LandingPage() {
  const canvasRef = useRef(null);

  // Animated gradient background blob
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let frame, t = 0;
    const ctx = el.getContext('2d');
    const resize = () => { el.width = el.offsetWidth; el.height = el.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      frame = requestAnimationFrame(draw);
      t += 0.008;
      const { width: w, height: h } = el;
      ctx.clearRect(0, 0, w, h);

      const blobs = [
        { x: w*0.25 + Math.sin(t)*w*0.08, y: h*0.35 + Math.cos(t*0.7)*h*0.06, r: w*0.28, c: 'rgba(232,97,74,0.13)' },
        { x: w*0.75 + Math.cos(t*0.9)*w*0.06, y: h*0.55 + Math.sin(t*1.1)*h*0.08, r: w*0.22, c: 'rgba(212,165,116,0.12)' },
        { x: w*0.5  + Math.sin(t*1.3)*w*0.05, y: h*0.2  + Math.cos(t*0.8)*h*0.05, r: w*0.18, c: 'rgba(232,97,74,0.08)' },
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
            <Link to="/login" className="btn btn-ghost btn-sm">Войти</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <canvas ref={canvasRef} className={styles.heroBgCanvas} />
        <div className={styles.container}>
          <div className={styles.heroBadge}>🚀 Технология 3D визуализации</div>
          <h1 className={styles.heroTitle}>
            Клиент видит свой торт<br />
            <em>до того как его заказать</em>
          </h1>
          <p className={styles.heroSubtitle}>
            Интерактивная 3D модель строится в реальном времени прямо в браузере — пока клиент выбирает форму, крем, украшения и добавляет надпись.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/shop/sweetcake" className="btn btn-primary btn-xl">Посмотреть демо →</Link>
          </div>

          {/* Demo preview card */}
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
                  <div className={styles.previewStepLabel}>Шаг 2 из 6 · Украшения</div>
                  <div className={styles.previewOptions}>
                    <div className={`${styles.previewOption} ${styles.selected}`}>🍓 Фрукты</div>
                    <div className={styles.previewOption}>🫐 Ягоды</div>
                    <div className={styles.previewOption}>🍫 Шоколад</div>
                  </div>
                </div>
                <div className={styles.previewPrice}>
                  <span>Итого</span>
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
          <div className={styles.sectionLabel}>Преимущества</div>
          <h2 className={styles.sectionTitle}>Почему 3D визуализация работает</h2>
          <div className={styles.benefitsGrid}>
            {BENEFITS.map(b => (
              <div key={b.title} className={styles.benefitCard}>
                <div className={styles.benefitIcon}>{b.icon}</div>
                <h3 className={styles.benefitTitle}>{b.title}</h3>
                <p className={styles.benefitDesc}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech showcase */}
      <section className={styles.section} id="tech">
        <div className={styles.container}>
          <div className={styles.sectionLabel}>Технология</div>
          <h2 className={styles.sectionTitle}>Что умеет наш 3D движок</h2>
          <div className={styles.techLayout}>
            <div className={styles.techPoints}>
              {TECH_POINTS.map(p => (
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
            <h2 className={styles.ctaTitle}>Хотите попробовать?</h2>
            <p className={styles.ctaDesc}>Откройте демо-магазин и сами постройте торт в 3D — это занимает меньше минуты.</p>
            <Link to="/shop/sweetcake" className="btn btn-primary btn-xl">Открыть демо магазин</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.footerLogo}><span>🍰</span> CakeBuilder</div>
            <p className={styles.footerCopy}>© 2026 CakeBuilder</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
