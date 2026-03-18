import React, { useEffect, useState } from 'react';
import { shopAPI } from '../../utils/api';
import useAuthStore from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { useLang } from '../../i18n';
import styles from './DashProfile.module.css';

export default function DashProfile() {
  const { shop, setShop } = useAuthStore();
  const [form, setForm] = useState({ name: '', description: '', city: '', address: '', phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useLang();
  const PR = t.dashboard.profile;

  useEffect(() => {
    shopAPI.getMy().then(r => {
      const s = r.data;
      setForm({ name: s.name || '', description: s.description || '', city: s.city || '', address: s.address || '', phone: s.phone || '', email: s.email || '' });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await shopAPI.updateMy(form);
      setShop(res.data);
      toast.success(PR.saveSuccess);
    } catch { toast.error(PR.saveError); }
    finally { setSaving(false); }
  };

  const field = (key) => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{PR.title}</h1>
        <p className={styles.sub}>{PR.sub}</p>
      </div>

      <form className={styles.form} onSubmit={handleSave}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>{PR.identityTitle}</div>
          <div className={styles.fieldGrid}>
            <div className="form-group">
              <label className="form-label">{PR.bakeryName}</label>
              <input className="form-input" required placeholder="Сладкие торты" {...field('name')} />
            </div>
            <div className="form-group">
              <label className="form-label">{PR.email}</label>
              <input className="form-input" type="email" placeholder="hello@yourbakery.com" {...field('email')} />
            </div>
          </div>
          <div className="form-group mt-4">
            <label className="form-label">{PR.description}</label>
            <textarea className="form-input" placeholder={PR.descPlaceholder} {...field('description')} />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>{PR.locationTitle}</div>
          <div className={styles.fieldGrid}>
            <div className="form-group">
              <label className="form-label">{PR.city}</label>
              <input className="form-input" placeholder="Ашхабад" {...field('city')} />
            </div>
            <div className="form-group">
              <label className="form-label">{PR.address}</label>
              <input className="form-input" placeholder="ул. Горького, 12" {...field('address')} />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>{PR.contactTitle}</div>
          <div className="form-group">
            <label className="form-label">{PR.phone}</label>
            <input className="form-input" type="tel" placeholder="+7 999 000-00-00" {...field('phone')} />
          </div>
        </div>

        {shop && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>{PR.subscriptionTitle}</div>
            <div className={styles.subInfo}>
              <div className={styles.subRow}><span>{PR.plan}</span><strong>{shop.subscription_plan}</strong></div>
              <div className={styles.subRow}><span>{PR.status}</span>
                <span className={`badge badge-${shop.subscription_status}`}>{shop.subscription_status}</span>
              </div>
              {shop.trial_ends_at && (
                <div className={styles.subRow}>
                  <span>{PR.trialEnds}</span>
                  <strong>{new Date(shop.trial_ends_at).toLocaleDateString('ru-RU')}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
          {saving ? <span className="spinner" /> : PR.saveBtn}
        </button>
      </form>
    </div>
  );
}
