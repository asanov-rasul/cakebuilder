import React, { useEffect, useState } from 'react';
import { shopAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import styles from './DashMenu.module.css';

const SECTIONS = [
  { key: 'shapes',      label: 'Формы',     icon: '🔵', addLabel: 'Добавить форму',      fields: ['name', 'price_modifier'] },
  { key: 'fillings',    label: 'Начинки',   icon: '🍫', addLabel: 'Добавить начинку',    fields: ['name', 'price_modifier'] },
  { key: 'creams',      label: 'Кремы',     icon: '🧁', addLabel: 'Добавить крем',       fields: ['name', 'price_modifier'] },
  { key: 'decorations', label: 'Украшения', icon: '🍓', addLabel: 'Добавить украшение',  fields: ['name', 'price'] },
];

function MenuSection({ section, items, onAdd, onToggle, onDelete, onEdit }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', price_modifier: '0', price: '0' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onAdd(section.key, form);
      setForm({ name: '', price_modifier: '0', price: '0' });
      setAdding(false);
      toast.success('Добавлено');
    } catch { toast.error('Не удалось добавить'); }
    finally { setSaving(false); }
  };

  const handleEditSave = async (id) => {
    setSaving(true);
    try {
      await onEdit(section.key, id, editForm);
      setEditingId(null);
      toast.success('Сохранено');
    } catch { toast.error('Не удалось сохранить'); }
    finally { setSaving(false); }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, price_modifier: item.price_modifier, price: item.price, weight_kg: item.weight_kg, price_multiplier: item.price_multiplier });
  };

  const priceField = section.fields.includes('price') ? 'price' : 'price_modifier';

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <span>{section.icon}</span>
          <span>{section.label}</span>
          <span className={styles.count}>{items.length}</span>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setAdding(!adding)}>
          {adding ? 'Отмена' : `+ ${section.addLabel}`}
        </button>
      </div>

      {adding && (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <input className="form-input" required placeholder="Название"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className={styles.priceInputWrap}>
            <input className={`form-input ${styles.priceInput}`} type="number" min="0" step="0.5"
              placeholder="Доп. цена"
              value={form[priceField]}
              onChange={e => setForm({ ...form, [priceField]: e.target.value })} />
            <span className={styles.dollarSign}>ТМТ</span>
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Добавить'}
          </button>
        </form>
      )}

      <div className={styles.itemsList}>
        {items.length === 0 && <div className={styles.emptySection}>Список пуст</div>}
        {items.map(item => (
          <div key={item.id} className={`${styles.itemRow} ${!item.is_active ? styles.itemDisabled : ''}`}>
            {editingId === item.id ? (
              <div className={styles.editRow}>
                <input className="form-input" value={editForm.name || ''}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                <div className={styles.priceInputWrap}>
                  <input className={`form-input ${styles.priceInput}`} type="number" min="0" step="0.5"
                    value={editForm[priceField] || 0}
                    onChange={e => setEditForm({ ...editForm, [priceField]: e.target.value })} />
                  <span className={styles.dollarSign}>ТМТ</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => handleEditSave(item.id)} disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Сохранить'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Отмена</button>
              </div>
            ) : (
              <>
                <div className={styles.itemName}>{item.name || `${item.weight_kg} кг`}</div>
                <div className={styles.itemPrice}>
                  {parseFloat(item[priceField] || item.price_modifier || 0) > 0
                    ? `+${parseFloat(item[priceField] || item.price_modifier).toFixed(2)} ТМТ`
                    : 'Включено'}
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.editBtn} title="Редактировать" onClick={() => startEdit(item)}>✏️</button>
                  <button
                    className={`${styles.toggleBtn} ${item.is_active ? styles.toggleOn : styles.toggleOff}`}
                    onClick={() => onToggle(section.key, item.id, !item.is_active)}
                    title={item.is_active ? 'Отключить' : 'Включить'}
                  >
                    {item.is_active ? 'Вкл' : 'Выкл'}
                  </button>
                  <button className={styles.deleteBtn} title="Удалить"
                    onClick={() => { if (window.confirm('Удалить этот элемент?')) onDelete(section.key, item.id); }}>
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashMenu() {
  const [menu, setMenu] = useState({ shapes: [], sizes: [], fillings: [], creams: [], decorations: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shopAPI.getMenu().then(r => setMenu(r.data)).finally(() => setLoading(false));
  }, []);

  const handleAdd = async (type, data) => {
    const res = await shopAPI.addMenuItem(type, data);
    setMenu(prev => ({ ...prev, [type]: [...prev[type], res.data] }));
  };

  const handleToggle = async (type, id, is_active) => {
    const res = await shopAPI.updateMenuItem(type, id, { is_active });
    setMenu(prev => ({ ...prev, [type]: prev[type].map(i => i.id === id ? res.data : i) }));
    toast.success(is_active ? 'Включено' : 'Отключено');
  };

  const handleEdit = async (type, id, data) => {
    const res = await shopAPI.updateMenuItem(type, id, data);
    setMenu(prev => ({ ...prev, [type]: prev[type].map(i => i.id === id ? res.data : i) }));
  };

  const handleDelete = async (type, id) => {
    await shopAPI.deleteMenuItem(type, id);
    setMenu(prev => ({ ...prev, [type]: prev[type].filter(i => i.id !== id) }));
    toast.success('Удалено');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Настройки меню</h1>
        <p className={styles.sub}>Управляйте тем, из чего клиенты строят торт</p>
      </div>

      <div className={styles.grid}>
        {SECTIONS.map(section => (
          <MenuSection
            key={section.key}
            section={section}
            items={menu[section.key] || []}
            onAdd={handleAdd}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
