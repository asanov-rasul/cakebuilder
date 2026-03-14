import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { useLang, LangSwitcher } from '../i18n';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLang();
  const A = t.auth;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(A.loginSuccess);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'shop_owner') navigate('/dashboard');
      else navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || A.loginError);
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
          <h1 className={styles.leftTitle}>{A.loginTitle}</h1>
          <p className={styles.leftSub}>{A.loginSub}</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{A.email}</label>
              <input className="form-input" type="email" required placeholder="you@yourbakery.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{A.password}</label>
              <input className="form-input" type="password" required placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : A.signIn}
            </button>
          </form>

          <div className={styles.demoBox}>
            <p className={styles.demoTitle}>{A.demoTitle}</p>
            <div className={styles.demoRow}><span>Admin</span><code>admin@cakebuilder.com / admin123</code></div>
            <div className={styles.demoRow}><span>Shop</span><code>owner@sweetcake.com / demo123</code></div>
          </div>

          <p className={styles.switchLink}>
            {A.noAccount} <Link to="/register">{A.createFree}</Link>
          </p>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.rightDecor}>
          <div className={styles.floatCard} style={{ top: '18%', left: '10%' }}><span>🎂</span> {A.floatOrder}</div>
          <div className={styles.floatCard} style={{ top: '42%', right: '8%' }}><span>✅</span> {A.floatPayment}</div>
          <div className={styles.floatCard} style={{ bottom: '22%', left: '15%' }}><span>⭐</span> {A.floatReview}</div>
          <div className={styles.bigEmoji}>🍰</div>
        </div>
      </div>
    </div>
  );
}
