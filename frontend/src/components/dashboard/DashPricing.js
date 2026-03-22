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
        <h1 className={styles.title}>Настройки цен</h1>
        <p className={styles.sub}>Установите базовую цену и наценки за каждый параметр</p>
      </div>

      {/* Базовая цена */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Базовая цена за кг</div>
        <p className={styles.cardDesc}>Начальная цена за торт весом 1 кг. Все размеры умножаются на это значение.</p>
        <div className={styles.basePriceRow}>
          <div className={styles.inputGroup}>
            <span className={styles.inputPrefix}>ТМТ</span>
            <input
              className="form-input"
              type="number" min="1" step="0.5"
              style={{ paddingLeft: 48 }}
              value={basePrice}
              onChange={e => setBasePrice(e.target.value)}
            />
            <span className={styles.inputSuffix}>за кг</span>
          </div>
          <button className="btn btn-primary" onClick={saveBasePrice} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Сохранить цену'}
          </button>
        </div>
      </div>

      {/* Цены по размерам */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Цены по размерам</div>
        <p className={styles.cardDesc}>Установите множитель для каждого размера. Итоговая цена = базовая × кг × множитель.</p>
        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Размер</span>
            <span>Множитель</span>
            <span>Пример цены</span>
          </div>
          {menu.sizes.map(size => (
            <div key={size.id} className={styles.tableRow}>
              <span className={styles.sizeLabel}>🎂 {size.weight_kg} кг</span>
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
              <span className={styles.examplePrice}>{calcExample(size)} ТМТ</span>
            </div>
          ))}
        </div>
      </div>

      {/* Таблицы наценок */}
      {[
        { key: 'shapes',      label: 'Наценка за форму',       field: 'price_modifier', icon: '🔵' },
        { key: 'fillings',    label: 'Наценка за начинку',     field: 'price_modifier', icon: '🍫' },
        { key: 'creams',      label: 'Наценка за крем',        field: 'price_modifier', icon: '🧁' },
        { key: 'decorations', label: 'Цена украшений',         field: 'price',          icon: '🍓' },
      ].map(({ key, label, field, icon }) => (
        <div className={styles.card} key={key}>
          <div className={styles.cardTitle}>{icon} {label}</div>
          <p className={styles.cardDesc}>Доплата сверх базовой цены торта.</p>
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Название</span>
              <span>Доп. цена (ТМТ)</span>
            </div>
            {menu[key]?.length === 0 && (
              <div className={styles.emptyRow}>Нет элементов — добавьте их в настройках меню</div>
            )}
            {menu[key]?.map(item => (
              <div key={item.id} className={`${styles.tableRow} ${!item.is_active ? styles.rowDisabled : ''}`}>
                <span className={styles.itemName}>{item.name || `${item.weight_kg} кг`}</span>
                <div className={styles.priceInputGroup}>
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
