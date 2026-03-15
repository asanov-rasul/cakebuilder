import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { useLang, LangSwitcher } from '../i18n';
import styles from './AuthPage.module.css';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', role: 'shop_owner', shop_name: '', shop_slug: '' });
  const [loading, setLoading] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLang();
  const A = t.auth;

  const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const handleShopNameChange = (val) => {
    const updates = { shop_name: val };
    if (!slugEdited) updates.shop_slug = slugify(val);
    setForm({ ...form, ...updates });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setLoading(true);
    try {
      await register(form);
      toast.success(A.registerSuccess);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || A.registerError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.leftContent}>
          <div className={styles.topRow}>
            <Link to="/" className={styles.logo}>🍰 CakeBuilder</Link>
            <LangSwitcher />
          </div>

          <div className={styles.stepIndicator}>
            <div className={`${styles.stepDot} ${step >= 1 ? styles.stepActive : ''}`}>1</div>
            <div className={styles.stepLine} />
            <div className={`${styles.stepDot} ${step >= 2 ? styles.stepActive : ''}`}>2</div>
          </div>

          <h1 className={styles.leftTitle}>{step === 1 ? A.registerTitle1 : A.registerTitle2}</h1>
          <p className={styles.leftSub}>{step === 1 ? A.registerSub1 : A.registerSub2}</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            {step === 1 && (
              <>
                <div className="form-group">
                  <label className="form-label">{A.fullName}</label>
                  <input className="form-input" type="text" required placeholder="Анна Иванова"
                    value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{A.email}</label>
                  <input className="form-input" type="email" required placeholder="you@yourbakery.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{A.password}</label>
                  <input className="form-input" type="password" required minLength={6} placeholder={A.passwordHint}
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{A.phone}</label>
                  <input className="form-input" type="tel" placeholder="+7 999 000-00-00"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="form-group">
                  <label className="form-label">{A.bakeryName}</label>
                  <input className="form-input" type="text" required placeholder="Сладкие торты"
                    value={form.shop_name} onChange={(e) => handleShopNameChange(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{A.shopUrl}</label>
                  <div className={styles.slugField}>
                    <span className={styles.slugPrefix}>cakebuilder.app/shop/</span>
                    <input className={`form-input ${styles.slugInput}`} type="text" required placeholder="moi-tort"
                      value={form.shop_slug}
                      onChange={(e) => { setSlugEdited(true); setForm({ ...form, shop_slug: slugify(e.target.value) }); }} />
                  </div>
                </div>
              </>
            )}

            <div className={styles.formActions}>
              {step === 2 && (
                <button type="button" className="btn btn-outline btn-lg" onClick={() => setStep(1)}>
                  {t.common.back}
                </button>
              )}
              <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? <span className="spinner" /> : step === 1 ? A.continue : A.createShop}
              </button>
            </div>
          </form>

          <p className={styles.switchLink}>{A.hasAccount} <Link to="/login">{A.signInLink}</Link></p>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.rightDecor}>
          <div className={styles.floatCard} style={{ top: '18%', left: '10%' }}><span>🔗</span> {A.floatLink}</div>
          <div className={styles.floatCard} style={{ top: '42%', right: '8%' }}><span>📦</span> {A.floatOrders}</div>
          <div className={styles.floatCard} style={{ bottom: '22%', left: '15%' }}><span>🎨</span> {A.floatMenu}</div>
          <div className={styles.bigEmoji}>🧁</div>
        </div>
      </div>
    </div>
  );
}
