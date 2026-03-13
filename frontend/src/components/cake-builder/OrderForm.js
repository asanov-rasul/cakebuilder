import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import useCakeStore from '../../store/cakeStore';
import { orderAPI } from '../../utils/api';
import styles from './OrderForm.module.css';

export default function OrderForm({ shopId, shopName, onOrderPlaced, onBack }) {
  const { shape, size, filling, cream, decorations, cakeText, calculatePrice, getCakeConfig, reset } = useCakeStore();
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', delivery_date: '', delivery_time: '', comment: '' });
  const [loading, setLoading] = useState(false);
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
      toast.error(err.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {/* Summary */}
      <div className={styles.summaryCard}>
        <h3 className={styles.summaryTitle}>Your cake summary</h3>
        <div className={styles.summaryGrid}>
          {[
            { l: 'Shape', v: shape?.name },
            { l: 'Size', v: size ? `${size.weight_kg} kg` : '—' },
            { l: 'Filling', v: filling?.name || '—' },
            { l: 'Cream', v: cream?.name || '—' },
            { l: 'Decorations', v: decorations.length ? decorations.map(d => d.name).join(', ') : 'None' },
            { l: 'Text', v: cakeText || 'None' },
          ].map(r => (
            <div key={r.l} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>{r.l}</span>
              <span className={styles.summaryValue}>{r.v}</span>
            </div>
          ))}
        </div>
        <div className={styles.summaryTotal}>
          <span>Total price</span>
          <span className={styles.summaryTotalPrice}>${price.toFixed(2)}</span>
        </div>
      </div>

      {/* Form */}
      <div className={styles.formCard}>
        <h3 className={styles.formTitle}>Delivery details</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">Your name *</label>
              <input className="form-input" type="text" required placeholder="Emma Johnson"
                value={form.customer_name}
                onChange={e => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone number *</label>
              <input className="form-input" type="tel" required placeholder="+1 555 0100"
                value={form.customer_phone}
                onChange={e => setForm({ ...form, customer_phone: e.target.value })} />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">Delivery date</label>
              <input className="form-input" type="date" min={minDate}
                value={form.delivery_date}
                onChange={e => setForm({ ...form, delivery_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Delivery time</label>
              <input className="form-input" type="time"
                value={form.delivery_time}
                onChange={e => setForm({ ...form, delivery_time: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Additional notes (optional)</label>
            <textarea className="form-input" placeholder="Any special requests or allergies..."
              value={form.comment}
              onChange={e => setForm({ ...form, comment: e.target.value })} />
          </div>

          <div className={styles.formFooter}>
            <button type="button" className="btn btn-ghost" onClick={onBack || (() => window.history.back())}>
              ← Edit cake
            </button>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <span className="spinner" /> : `Place order · $${price.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
