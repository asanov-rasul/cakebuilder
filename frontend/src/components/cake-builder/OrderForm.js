import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import useCakeStore from '../../store/cakeStore';
import { orderAPI } from '../../utils/api';
import { useLang } from '../../i18n';
import styles from './OrderForm.module.css';

export default function OrderForm({ shopId, shopName, onOrderPlaced, onBack }) {
  const { shape, size, filling, cream, decorations, cakeText, calculatePrice, getCakeConfig } = useCakeStore();
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', delivery_date: '', delivery_time: '', comment: '' });
  const [loading, setLoading] = useState(false);
  const { t } = useLang();
  const O = t.order;
  const price = calculatePrice();
  const config = getCakeConfig();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await orderAPI.create({
        shop_id: shopId,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        cake_shape: shape?.name,
        cake_size_kg: size?.weight_kg,
        cake_filling: filling?.name,
        cake_cream: cream?.name,
        cake_decorations: decorations.map(d => d.name),
        cake_text: cakeText,
        cake_config: config,
        total_price: price,
        delivery_date: form.delivery_date || null,
        delivery_time: form.delivery_time || null,
        comment: form.comment || null,
      });
      onOrderPlaced(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || O.errorPlace);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.summaryCard}>
        <h3 className={styles.summaryTitle}>{O.summary}</h3>
        <div className={styles.summaryGrid}>
          {[
            { l: O.shape,       v: shape?.name },
            { l: O.size,        v: size ? `${size.weight_kg} kg` : '—' },
            { l: O.filling,     v: filling?.name || '—' },
            { l: O.cream,       v: cream?.name || '—' },
            { l: O.decorations, v: decorations.length ? decorations.map(d => d.name).join(', ') : O.none },
            { l: O.text,        v: cakeText || O.none },
          ].map(r => (
            <div key={r.l} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{r.l}</span>
              <span className={styles.summaryValue}>{r.v}</span>
            </div>
          ))}
        </div>
        <div className={styles.summaryTotal}>
          <span>{O.totalPrice}</span>
          <span className={styles.summaryTotalPrice}>${price.toFixed(2)}</span>
        </div>
      </div>

      <div className={styles.formCard}>
        <h3 className={styles.formTitle}>{O.deliveryTitle}</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">{O.yourName}</label>
              <input className="form-input" type="text" required placeholder="Анна Иванова"
                value={form.customer_name}
                onChange={e => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{O.phone}</label>
              <input className="form-input" type="tel" required placeholder="+7 999 000-00-00"
                value={form.customer_phone}
                onChange={e => setForm({ ...form, customer_phone: e.target.value })} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">{O.deliveryDate}</label>
              <input className="form-input" type="date" min={minDate}
                value={form.delivery_date}
                onChange={e => setForm({ ...form, delivery_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{O.deliveryTime}</label>
              <input className="form-input" type="time"
                value={form.delivery_time}
                onChange={e => setForm({ ...form, delivery_time: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{O.notes}</label>
            <textarea className="form-input" placeholder={O.notesPlaceholder}
              value={form.comment}
              onChange={e => setForm({ ...form, comment: e.target.value })} />
          </div>
          <div className={styles.formFooter}>
            <button type="button" className="btn btn-ghost" onClick={onBack || (() => window.history.back())}>
              {O.editCake}
            </button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : `${O.placeOrder} · $${price.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
