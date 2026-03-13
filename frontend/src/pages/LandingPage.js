import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';

const features = [
  { icon: '🎂', title: 'Cake Builder', desc: 'Step-by-step customization for shape, filling, cream, decorations, and personal text.' },
  { icon: '📦', title: 'Order Management', desc: 'Receive and manage orders with status tracking from new to completed.' },
  { icon: '🎨', title: 'Custom Menu', desc: 'Set your own fillings, creams, decorations, and prices. Full control.' },
  { icon: '📱', title: 'Mobile-First', desc: 'Customers order from any device. Large buttons, smooth experience.' },
  { icon: '🔗', title: 'Your Shop URL', desc: 'Get a unique link like /shop/yourname to share with customers.' },
  { icon: '📊', title: 'Dashboard', desc: 'View revenue, orders, and manage your shop from one clean dashboard.' },
];

const steps = [
  { n: '01', title: 'Sign up your shop', desc: 'Create an account, enter your shop details, and get your unique shop URL.' },
  { n: '02', title: 'Customize your menu', desc: 'Set cake options, prices, fillings, and decorations in your dashboard.' },
  { n: '03', title: 'Share & receive orders', desc: 'Share your link. Customers build their cake and place orders directly.' },
];

const plans = [
  {
    name: 'Starter',
    price: '$10',
    period: '/month',
    desc: 'Perfect for small bakeries just getting started.',
    features: ['Up to 100 orders/month', 'Cake builder', 'Order management', 'Shop profile page', '14-day free trial'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Business',
    price: '$20',
    period: '/month',
    desc: 'For growing shops with high order volume.',
    features: ['Unlimited orders', 'Everything in Starter', 'Advanced analytics', 'Priority support', '14-day free trial'],
    cta: 'Start Free Trial',
    highlight: true,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🍰</span>
            <span className={styles.logoText}>CakeBuilder</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#how-it-works" className={styles.navLink}>How it works</a>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#pricing" className={styles.navLink}>Pricing</a>
          </div>
          <div className={styles.navActions}>
            <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroBadge}>✨ 14-day free trial · No credit card required</div>
          <h1 className={styles.heroTitle}>
            Let customers build<br />
            <em>their dream cake</em>
          </h1>
          <p className={styles.heroSubtitle}>
            Give your bakery a beautiful online ordering experience. Customers customise their cake step-by-step and place orders directly — no phone calls needed.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/register" className="btn btn-primary btn-xl">Start for free</Link>
            <Link to="/shop/sweetcake" className="btn btn-outline btn-lg">See a demo shop →</Link>
          </div>

          {/* Mock UI preview */}
          <div className={styles.heroPreview}>
            <div className={styles.previewBar}>
              <div className={styles.previewDots}>
                <span /><span /><span />
              </div>
              <div className={styles.previewUrl}>cakebuilder.app/shop/sweetcake</div>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewStep}>
                <div className={styles.previewStepLabel}>Step 1 of 6 · Choose shape</div>
                <div className={styles.previewOptions}>
                  <div className={`${styles.previewOption} ${styles.selected}`}>🔵 Round</div>
                  <div className={styles.previewOption}>⬛ Square</div>
                  <div className={styles.previewOption}>❤️ Heart</div>
                </div>
              </div>
              <div className={styles.previewPrice}>
                <span>Total price</span>
                <strong>$32.50</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.section} id="how-it-works">
        <div className={styles.container}>
          <div className={styles.sectionLabel}>How it works</div>
          <h2 className={styles.sectionTitle}>Up and running in minutes</h2>
          <div className={styles.stepsGrid}>
            {steps.map((s) => (
              <div key={s.n} className={styles.stepCard}>
                <div className={styles.stepNumber}>{s.n}</div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={`${styles.section} ${styles.sectionAlt}`} id="features">
        <div className={styles.container}>
          <div className={styles.sectionLabel}>Features</div>
          <h2 className={styles.sectionTitle}>Everything your bakery needs</h2>
          <div className={styles.featuresGrid}>
            {features.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.section} id="pricing">
        <div className={styles.container}>
          <div className={styles.sectionLabel}>Pricing</div>
          <h2 className={styles.sectionTitle}>Simple, honest pricing</h2>
          <div className={styles.plansGrid}>
            {plans.map((p) => (
              <div key={p.name} className={`${styles.planCard} ${p.highlight ? styles.planHighlight : ''}`}>
                {p.highlight && <div className={styles.planBadge}>Most popular</div>}
                <div className={styles.planName}>{p.name}</div>
                <div className={styles.planPrice}>
                  {p.price}<span>{p.period}</span>
                </div>
                <p className={styles.planDesc}>{p.desc}</p>
                <ul className={styles.planFeatures}>
                  {p.features.map((f) => (
                    <li key={f}><span>✓</span>{f}</li>
                  ))}
                </ul>
                <Link to="/register" className={`btn w-full ${p.highlight ? 'btn-primary' : 'btn-outline'} btn-lg`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaBox}>
            <h2 className={styles.ctaTitle}>Ready to grow your bakery?</h2>
            <p className={styles.ctaDesc}>Join hundreds of cake shops using CakeBuilder to take orders online.</p>
            <Link to="/register" className="btn btn-primary btn-xl">Get started — it's free</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.footerLogo}>
              <span>🍰</span> CakeBuilder
            </div>
            <p className={styles.footerCopy}>© 2026 CakeBuilder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
