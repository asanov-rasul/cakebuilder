import React, { useEffect, useState } from 'react';
import { shopAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { useLang } from '../../i18n';
import styles from './DashMenu.module.css';

function MenuSection({ sectionKey, label, icon, addLabel, items, onAdd, onToggle, onDelete, onEdit }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', price_modifier: '0', price: '0' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const { t } = useLang();
  const M = t.dashboard.menu;

  const hasPrice = ['decorations'].includes(sectionKey);
  const priceField = hasPrice ? 'price' : 'price_modifier';

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onAdd(sectionKey, form);
      setForm({ name: '', price_modifier: '0', price: '0' });
      setAdding(false);
      toast.success(M.addSuccess);
    } catch { toast.error(M.addError); }
    finally { setSaving(false); }
  };

  const handleEditSave = async (id) => {
    setSaving(true);
    try {
      await onEdit(sectionKey, id, editForm);
      setEditingId(null);
      toast.success(M.saveSuccess);
    } catch { toast.error(M.saveError); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(M.deleteConfirm)) return;
    try {
      await onDelete(sectionKey, id);
      toast.success(M.deleteSuccess);
    } catch { toast.error(M.deleteError); }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <span>{icon}</span>
          <span>{label}</span>
          <span className={styles.count}>{items.length}</span>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setAdding(!adding)}>
          {adding ? t.common.cancel : `+ ${addLabel}`}
        </button>
      </div>

      {adding && (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <input className="form-input" required placeholder={M.namePlaceholder}
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className={styles.priceInputWrap}>
            <span className={styles.dollarSign}>$</span>
            <input className={`form-input ${styles.priceInput}`} type="number" min="0" step="0.5"
              placeholder={M.pricePlaceholder}
              value={form[priceField]}
              onChange={e => setForm({ ...form, [priceField]: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : M.add}
          </button>
        </form>
      )}

      <div className={styles.itemsList}>
        {items.length === 0 && <div className={styles.emptySection}>{M.empty}</div>}
        {items.map(item => (
          <div key={item.id} className={`${styles.itemRow} ${!item.is_active ? styles.itemDisabled : ''}`}>
            {editingId === item.id ? (
              <div className={styles.editRow}>
                <input className="form-input" value={editForm.name || ''}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                <div className={styles.priceInputWrap}>
                  <span className={styles.dollarSign}>$</span>
                  <input className={`form-input ${styles.priceInput}`} type="number" min="0" step="0.5"
                    value={editForm[priceField] || 0}
                    onChange={e => setEditForm({ ...editForm, [priceField]: e.target.value })} />
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => handleEditSave(item.id)} disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : M.save}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>{M.cancel}</button>
              </div>
            ) : (
              <div className={styles.itemContent}>
                <div className={styles.itemName}>{item.name}</div>
                <div className={styles.itemPrice}>
                  ${parseFloat(item[priceField] || 0).toFixed(2)}
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.toggleBtn} onClick={() => onToggle(sectionKey, item.id, !item.is_active)}
                    title={item.is_active ? 'Деактивировать' : 'Активировать'}>
                    {item.is_active ? '✓' : '○'}
                  </button>
                  <button className={styles.editBtn} onClick={() => {
                    setEditingId(item.id);
                    setEditForm({ name: item.name, price_modifier: item.price_modifier, price: item.price });
                  }}>✏️</button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashMenu() {
  const [menu, setMenu] = useState({ shapes: [], fillings: [], creams: [], decorations: [] });
  const [loading, setLoading] = useState(true);
  const { t } = useLang();
  const M = t.dashboard.menu;
  const S = M.sections;

  useEffect(() => {
    shopAPI.getMenu().then(r => setMenu(r.data)).finally(() => setLoading(false));
  }, []);

  const SECTIONS = [
    { key: 'shapes',      label: S.shapes,      icon: '🔵', addLabel: M.addShape },
    { key: 'fillings',    label: S.fillings,     icon: '🍫', addLabel: M.addFilling },
    { key: 'creams',      label: S.creams,       icon: '🧁', addLabel: M.addCream },
    { key: 'decorations', label: S.decorations,  icon: '🍓', addLabel: M.addDecoration },
  ];

  const handleAdd = async (type, form) => {
    const res = await shopAPI.addMenuItem(type, form);
    setMenu(prev => ({ ...prev, [type]: [...prev[type], res.data] }));
  };

  const handleEdit = async (type, id, form) => {
    const res = await shopAPI.updateMenuItem(type, id, form);
    setMenu(prev => ({ ...prev, [type]: prev[type].map(i => i.id === id ? res.data : i) }));
  };

  const handleToggle = async (type, id, is_active) => {
    const res = await shopAPI.updateMenuItem(type, id, { is_active });
    setMenu(prev => ({ ...prev, [type]: prev[type].map(i => i.id === id ? res.data : i) }));
  };

  const handleDelete = async (type, id) => {
    await shopAPI.deleteMenuItem(type, id);
    setMenu(prev => ({ ...prev, [type]: prev[type].filter(i => i.id !== id) }));
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{M.title}</h1>
        <p className={styles.sub}>{M.sub}</p>
      </div>
      <div className={styles.grid}>
        {SECTIONS.map(sec => (
          <MenuSection
            key={sec.key}
            sectionKey={sec.key}
            label={sec.label}
            icon={sec.icon}
            addLabel={sec.addLabel}
            items={menu[sec.key] || []}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
