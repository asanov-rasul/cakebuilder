import React, { useEffect, useState } from 'react';
import { shopAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import styles from './DashPricing.module.css';

export default function DashPricing() {
  const [shop, setShop] = useState(null);
  const [menu, setMenu] = useState({ sizes: [], shapes: [], fillings: [], creams: [], decorations: [] });
  const [basePrice, setBasePrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([shopAPI.getMy(), shopAPI.getMenu()]).then(([shopRes, menuRes]) => {
      setShop(shopRes.data);
      setBasePrice(shopRes.data.price_per_kg_base);
      setMenu(menuRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const saveBasePrice = async () => {
    if (!basePrice || isNaN(basePrice)) return toast.error('Введите корректную цену');
    setSaving(true);
    try {
      const res = await shopAPI.updateMy({ ...shop, price_per_kg_base: parseFloat(basePrice) });
      setShop(res.data);
      toast.success('Базовая цена сохранена!');
    } catch { toast.error('Не удалось сохранить'); }
    finally { setSaving(false); }
  };

  const updateItemPrice = async (type, id, field, value) => {
    try {
      await shopAPI.updateMenuItem(type, id, { [field]: parseFloat(value) });
      setMenu(prev => ({
        ...prev,
        [type]: prev[type].map(i => i.id === id ? { ...i, [field]: value } : i),
      }));
      toast.success('Цена обновлена');
    } catch { toast.error('Не удалось обновить'); }
  };

  const calcExample = (size) => {
    const b = parseFloat(basePrice) || 0;
    return (b * parseFloat(size.weight_kg) * parseFloat(size.price_multiplier)).toFixed(2);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Pricing settings</h1>
        <p className={styles.sub}>Set your base price and per-item price modifiers</p>
      </div>

      {/* Base price */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Base price per kg</div>
        <p className={styles.cardDesc}>This is the starting price for a 1kg cake. All sizes multiply from this value.</p>
        <div className={styles.basePriceRow}>
          <div className={styles.inputGroup}>
            <span className={styles.inputPrefix}>$</span>
            <input
              className="form-input"
              type="number" min="1" step="0.5"
              style={{ paddingLeft: 28 }}
              value={basePrice}
              onChange={e => setBasePrice(e.target.value)}
            />
            <span className={styles.inputSuffix}>per kg</span>
          </div>
          <button className="btn btn-primary" onClick={saveBasePrice} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Сохранить цену'}
          </button>
        </div>
      </div>

      {/* Size pricing */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Size pricing</div>
        <p className={styles.cardDesc}>Set the multiplier for each size. Final price = base × kg × multiplier.</p>
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Size</span>
            <span>Multiplier</span>
            <span>Example price</span>
          </div>
          {menu.sizes.map(size => (
            <div key={size.id} className={styles.tableRow}>
              <span className={styles.sizeLabel}>🎂 {size.weight_kg} kg</span>
              <div className={styles.multiplierInput}>
                <input
                  className="form-input"
                  type="number" min="0.5" step="0.1"
                  style={{ width: 90 }}
                  value={size.price_multiplier}
                  onChange={e => setMenu(prev => ({
                    ...prev,
                    sizes: prev.sizes.map(s => s.id === size.id ? { ...s, price_multiplier: e.target.value } : s),
                  }))}
                  onBlur={e => updateItemPrice('sizes', size.id, 'price_multiplier', e.target.value)}
                />
                <span className={styles.xLabel}>×</span>
              </div>
              <span className={styles.examplePrice}>${calcExample(size)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modifier tables */}
      {[
        { key: 'shapes', label: 'Shape add-ons', field: 'price_modifier', icon: '🔵' },
        { key: 'fillings', label: 'Filling add-ons', field: 'price_modifier', icon: '🍫' },
        { key: 'creams', label: 'Cream add-ons', field: 'price_modifier', icon: '🧁' },
        { key: 'decorations', label: 'Decoration prices', field: 'price', icon: '🍓' },
      ].map(({ key, label, field, icon }) => (
        <div className={styles.card} key={key}>
          <div className={styles.cardTitle}>{icon} {label}</div>
          <p className={styles.cardDesc}>Extra cost added on top of the base cake price.</p>
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Name</span>
              <span>Extra price ($)</span>
            </div>
            {menu[key]?.length === 0 && (
              <div className={styles.emptyRow}>No items — add them in Menu settings</div>
            )}
            {menu[key]?.map(item => (
              <div key={item.id} className={`${styles.tableRow} ${!item.is_active ? styles.rowDisabled : ''}`}>
                <span className={styles.itemName}>{item.name || `${item.weight_kg}kg`}</span>
                <div className={styles.priceInputGroup}>
                  <span className={styles.dollarPrefix}>$</span>
                  <input
                    className="form-input"
                    type="number" min="0" step="0.5"
                    style={{ width: 90, paddingLeft: 22 }}
                    value={item[field] ?? 0}
                    onChange={e => setMenu(prev => ({
                      ...prev,
                      [key]: prev[key].map(i => i.id === item.id ? { ...i, [field]: e.target.value } : i),
                    }))}
                    onBlur={e => updateItemPrice(key, item.id, field, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
