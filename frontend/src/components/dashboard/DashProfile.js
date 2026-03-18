import React, { useEffect, useState } from 'react';
import { shopAPI } from '../../utils/api';
import useAuthStore from '../../store/authStore';
import { toast } from 'react-hot-toast';
import styles from './DashProfile.module.css';

export default function DashProfile() {
  const { shop, setShop } = useAuthStore();
  const [form, setForm] = useState({ name: '', description: '', city: '', address: '', phone: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      toast.success('Профиль магазина сохранён!');
    } catch { toast.error('Не удалось сохранить'); }
    finally { setSaving(false); }
  };

  const field = (key) => ({ value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Shop profile</h1>
        <p className={styles.sub}>Update your bakery information visible to customers</p>
      </div>

      <form className={styles.form} onSubmit={handleSave}>
        {/* Shop identity */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Identity</div>
          <div className={styles.fieldGrid}>
            <div className="form-group">
              <label className="form-label">Bakery name *</label>
              <input className="form-input" required placeholder="Sweet Cakes by Sarah" {...field('name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="hello@yourbakery.com" {...field('email')} />
            </div>
          </div>
          <div className="form-group mt-4">
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="Расскажите клиентам о вашей пекарне..." {...field('description')} />
          </div>
        </div>

        {/* Location */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Location & contact</div>
          <div className={styles.fieldGrid}>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" placeholder="New York" {...field('city')} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" type="tel" placeholder="+1 555 0100" {...field('phone')} />
            </div>
          </div>
          <div className="form-group mt-4">
            <label className="form-label">Full address</label>
            <input className="form-input" placeholder="123 Baker Street, New York, NY 10001" {...field('address')} />
          </div>
        </div>

        {/* Shop URL (read-only) */}
        {shop && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Your shop link</div>
            <p className={styles.cardDesc}>Share this link with your customers so they can order cakes.</p>
            <div className={styles.urlRow}>
              <div className={styles.urlDisplay}>
                cakebuilder.app/shop/<strong>{shop.slug}</strong>
              </div>
              <a
                href={`/shop/${shop.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
              >
                Open →
              </a>
            </div>
          </div>
        )}

        {/* Subscription info */}
        {shop && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Subscription</div>
            <div className={styles.subGrid}>
              <div className={styles.subItem}>
                <div className={styles.subLabel}>Plan</div>
                <div className={styles.subValue}>{shop.subscription_plan === 'business' ? 'Business' : 'Starter'}</div>
              </div>
              <div className={styles.subItem}>
                <div className={styles.subLabel}>Status</div>
                <span className={`badge badge-${shop.subscription_status}`}>{shop.subscription_status}</span>
              </div>
              {shop.subscription_status === 'trial' && shop.trial_ends_at && (
                <div className={styles.subItem}>
                  <div className={styles.subLabel}>Trial ends</div>
                  <div className={styles.subValue}>
                    {new Date(shop.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.saveRow}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <><span className="spinner" /> Saving...</> : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
