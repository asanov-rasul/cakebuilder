import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import styles from './AuthPage.module.css';

export default function RegisterPage() {
  const [step, setStep] = useState(1); // 1=account, 2=shop details
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '',
    role: 'shop_owner',
    shop_name: '', shop_slug: '',
  });
  const [loading, setLoading] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const slugify = (str) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

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
      const user = await register(form);
      toast.success('Shop created! Welcome to CakeBuilder 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.leftContent}>
          <Link to="/" className={styles.logo}>🍰 CakeBuilder</Link>

          <div className={styles.stepIndicator}>
            <div className={`${styles.stepDot} ${step >= 1 ? styles.stepActive : ''}`}>1</div>
            <div className={styles.stepLine} />
            <div className={`${styles.stepDot} ${step >= 2 ? styles.stepActive : ''}`}>2</div>
          </div>

          <h1 className={styles.leftTitle}>
            {step === 1 ? 'Create your account' : 'Set up your shop'}
          </h1>
          <p className={styles.leftSub}>
            {step === 1 ? '14-day free trial, no credit card needed' : 'Almost there! Just a few shop details'}
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            {step === 1 && (
              <>
                <div className="form-group">
                  <label className="form-label">Your full name</label>
                  <input className="form-input" type="text" required placeholder="Sarah Johnson"
                    value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input className="form-input" type="email" required placeholder="you@yourbakery.com"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" required minLength={6} placeholder="At least 6 characters"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone (optional)</label>
                  <input className="form-input" type="tel" placeholder="+1 555 0100"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="form-group">
                  <label className="form-label">Bakery name</label>
                  <input className="form-input" type="text" required placeholder="Sweet Cakes by Sarah"
                    value={form.shop_name} onChange={(e) => handleShopNameChange(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Your shop URL</label>
                  <div className={styles.slugField}>
                    <span className={styles.slugPrefix}>cakebuilder.app/shop/</span>
                    <input className={`form-input ${styles.slugInput}`} type="text" required
                      placeholder="sweetcakes"
                      value={form.shop_slug}
                      onChange={(e) => { setSlugEdited(true); setForm({ ...form, shop_slug: slugify(e.target.value) }); }} />
                  </div>
                </div>
              </>
            )}

            <div className={styles.formActions}>
              {step === 2 && (
                <button type="button" className="btn btn-outline btn-lg" onClick={() => setStep(1)}>
                  ← Back
                </button>
              )}
              <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
                style={{ flex: 1 }}>
                {loading ? <span className="spinner" /> : step === 1 ? 'Continue →' : 'Create my shop 🎉'}
              </button>
            </div>
          </form>

          <p className={styles.switchLink}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.rightDecor}>
          <div className={styles.floatCard} style={{ top: '18%', left: '10%' }}>
            <span>🔗</span> Your link is live instantly
          </div>
          <div className={styles.floatCard} style={{ top: '42%', right: '8%' }}>
            <span>📦</span> Orders in your dashboard
          </div>
          <div className={styles.floatCard} style={{ bottom: '22%', left: '15%' }}>
            <span>🎨</span> Fully customizable menu
          </div>
          <div className={styles.bigEmoji}>🧁</div>
        </div>
      </div>
    </div>
  );
}
