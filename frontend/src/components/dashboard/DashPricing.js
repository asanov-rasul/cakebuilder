import React, { useEffect, useState } from 'react';
import { shopAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { useLang } from '../../i18n';
import styles from './DashPricing.module.css';

export default function DashPricing() {
  const [shop, setShop] = useState(null);
  const [menu, setMenu] = useState({ sizes: [] });
  const [basePrice, setBasePrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useLang();
  const P = t.dashboard.pricing;

  useEffect(() => {
    Promise.all([shopAPI.getMy(), shopAPI.getMenu()]).then(([shopRes, menuRes]) => {
      setShop(shopRes.data);
      setBasePrice(shopRes.data.price_per_kg_base);
      setMenu(menuRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const saveBasePrice = async () => {
    if (!basePrice || isNaN(basePrice)) return toast.error(P.invalidPrice);
    setSaving(true);
    try {
      const res = await shopAPI.updateMy({ ...shop, price_per_kg_base: parseFloat(basePrice) });
      setShop(res.data);
      toast.success(P.saveSuccess);
    } catch { toast.error(P.saveError); }
    finally { setSaving(false); }
  };

  const updateItemPrice = async (type, id, field, value) => {
    try {
      await shopAPI.updateMenuItem(type, id, { [field]: parseFloat(value) });
      setMenu(prev => ({
        ...prev,
        [type]: prev[type].map(i => i.id === id ? { ...i, [field]: value } : i),
      }));
      toast.success(P.updateSuccess);
    } catch { toast.error(P.updateError); }
  };

  const calcExample = (size) => {
    const b = parseFloat(basePrice) || 0;
    return (b * parseFloat(size.weight_kg) * parseFloat(size.price_multiplier)).toFixed(2);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{P.title}</h1>
        <p className={styles.sub}>{P.sub}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>{P.basePriceTitle}</div>
        <p className={styles.cardDesc}>{P.basePriceDesc}</p>
        <div className={styles.basePriceRow}>
          <div className={styles.priceInputWrap}>
            <span className={styles.dollarSign}>TMT</span>
            <input
              className={`form-input ${styles.priceInput}`}
              type="number" min="1" step="0.5"
              value={basePrice}
              onChange={e => setBasePrice(e.target.value)}
            />
            <span className={styles.perKg}>{P.basePricePer}</span>
          </div>
          <button className="btn btn-primary" onClick={saveBasePrice} disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : P.saveBase}
          </button>
        </div>
      </div>

      {menu.sizes?.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>{P.sizesTitle}</div>
          <p className={styles.cardDesc}>{P.sizesDesc}</p>
          <div className={styles.sizesTable}>
            {menu.sizes.map(size => (
              <div key={size.id} className={styles.sizeRow}>
                <div className={styles.sizeLabel}>{size.weight_kg} kg</div>
                <div className={styles.sizeMultiplier}>×{size.price_multiplier}</div>
                <div className={styles.sizeExample}>{P.example}: <strong>${calcExample(size)}</strong></div>
                <div className={styles.priceInputWrap}>
                  <span className={styles.dollarSign}>×</span>
                  <input
                    className={`form-input ${styles.priceInput}`}
                    type="number" min="0.1" step="0.1"
                    value={size.price_multiplier}
                    onChange={e => updateItemPrice('sizes', size.id, 'price_multiplier', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
