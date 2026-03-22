import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { shopAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import styles from './DashMenu.module.css';

// Default colors for known items
const DEFAULT_COLORS = {
  fillings: {
    'Шоколад': '#3d1005', 'Chocolate': '#3d1005',
    'Ваниль': '#f5e498', 'Vanilla': '#f5e498',
    'Клубника': '#e03050', 'Strawberry': '#e03050',
    'Красный бархат': '#9a0808', 'Red Velvet': '#9a0808',
  },
  creams: {
    'Сливочный крем': '#ffeebb', 'Buttercream': '#ffeebb',
    'Шоколадный крем': '#2a0e04', 'Chocolate Cream': '#2a0e04',
    'Ванильный крем': '#fff7c8', 'Vanilla Cream': '#fff7c8',
  },
};

// Sections config
const SECTIONS = [
  { key: 'shapes',      label: 'Формы',     icon: '🔵', addLabel: 'Добавить форму',     hasColor: false },
  { key: 'fillings',    label: 'Начинки',   icon: '🍫', addLabel: 'Добавить начинку',   hasColor: true  },
  { key: 'creams',      label: 'Кремы',     icon: '🧁', addLabel: 'Добавить крем',      hasColor: true  },
  { key: 'decorations', label: 'Украшения', icon: '🍓', addLabel: 'Добавить украшение', hasColor: false },
];

// Default colors for color picker presets
const COLOR_PRESETS = [
  '#f5e498', '#ffeebb', '#fff7c8', // vanilla / cream shades
  '#3d1005', '#5c2210', '#2a0e04', // chocolate shades
  '#e03050', '#ff7090', '#c01818', // strawberry / red velvet
  '#d09a60', '#e8c080', '#b07840', // default sponge
  '#ffffff', '#fffde7', '#f3f4f6', // white / light
];

function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  const calcPos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({
      top: r.bottom + window.scrollY + 6,
      left: Math.min(r.left + window.scrollX, window.innerWidth - 240),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    calcPos();
    const close = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target) &&
          !document.getElementById('cp-portal')?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', calcPos, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', calcPos, true);
    };
  }, [open, calcPos]);

  const portal = open ? ReactDOM.createPortal(
    <div id="cp-portal" style={{
      position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999,
      background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 14, padding: 14,
      boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
      width: 224,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
        🎨 Цвет торта в 3D
      </div>
      <input
        type="color"
        value={value || '#d09a60'}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 40, border: 'none', borderRadius: 8,
          cursor: 'pointer', marginBottom: 10, display: 'block' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {COLOR_PRESETS.map(col => (
          <button key={col} type="button"
            onClick={() => { onChange(col); setOpen(false); }}
            style={{
              width: 26, height: 26, borderRadius: 7, background: col,
              border: value === col ? '2.5px solid #e8614a' : '1.5px solid #e5e7eb',
              cursor: 'pointer', transition: 'transform 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ))}
      </div>
      <button type="button" onClick={() => setOpen(false)}
        style={{ width: '100%', padding: '6px 0', fontSize: 13,
          border: 'none', background: '#f9fafb', borderRadius: 8,
          cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
        Применить
      </button>
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px 4px 6px',
          border: '1.5px solid #e5e7eb', borderRadius: 20,
          background: '#fff', cursor: 'pointer',
          fontSize: 12, color: '#6b7280', fontWeight: 500,
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#e8614a'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
      >
        <span style={{
          width: 18, height: 18, borderRadius: 5,
          background: value || '#d09a60',
          border: '1px solid rgba(0,0,0,0.1)',
          display: 'inline-block', flexShrink: 0,
        }} />
        🎨 Цвет 3D
      </button>
      {portal}
    </div>
  );
}

function MenuSection({ sectionKey, label, icon, addLabel, hasColor, items, onAdd, onToggle, onDelete, onEdit }) {
  const priceField = sectionKey === 'decorations' ? 'price' : 'price_modifier';
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', price_modifier: '0', price: '0', color: '#d09a60' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onAdd(sectionKey, form);
      setForm({ name: '', price_modifier: '0', price: '0', color: '#d09a60' });
      setAdding(false);
      toast.success('Добавлено');
    } catch { toast.error('Не удалось добавить'); }
    finally { setSaving(false); }
  };

  const handleEditSave = async (id) => {
    setSaving(true);
    try {
      await onEdit(sectionKey, id, editForm);
      setEditingId(null);
      toast.success('Сохранено');
    } catch { toast.error('Не удалось сохранить'); }
    finally { setSaving(false); }
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
          {adding ? 'Отмена' : `+ ${addLabel}`}
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
          </div>
          {hasColor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Цвет:</span>
              <ColorPicker value={form.color} onChange={color => setForm({ ...form, color })} />
            </div>
          )}
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
                </div>
                {hasColor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Цвет:</span>
                    <ColorPicker
                      value={editForm.color || '#d09a60'}
                      onChange={color => setEditForm({ ...editForm, color })}
                    />
                  </div>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => handleEditSave(item.id)} disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Сохранить'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Отмена</button>
              </div>
            ) : (
              <div className={styles.itemContent}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className={styles.itemName}>{item.name}</span>
                    {hasColor && (
                      <ColorPicker
                        value={item.color || DEFAULT_COLORS[sectionKey]?.[item.name] || '#d09a60'}
                        onChange={async (color) => {
                          try {
                            await onEdit(sectionKey, item.id, { ...item, color });
                            item.color = color; // optimistic update
                          } catch (e) { console.error(e); }
                        }}
                      />
                    )}
                  </div>
                  <div className={styles.itemPrice}>
                    {parseFloat(item[priceField] || 0) > 0
                      ? `+${parseFloat(item[priceField] || 0).toFixed(2)} ТМТ`
                      : 'Включено'}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.toggleBtn}
                    onClick={() => onToggle(sectionKey, item.id, !item.is_active)}
                    title={item.is_active ? 'Деактивировать' : 'Активировать'}>
                    {item.is_active ? '✓' : '○'}
                  </button>
                  <button className={styles.editBtn} onClick={() => {
                    setEditingId(item.id);
                    setEditForm({
                      name: item.name,
                      price_modifier: item.price_modifier,
                      price: item.price,
                      color: item.color || '#d09a60',
                    });
                  }}>✏️</button>
                  <button className={styles.deleteBtn}
                    onClick={() => { if (window.confirm('Удалить этот элемент?')) onDelete(sectionKey, item.id); }}>
                    🗑️
                  </button>
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

  useEffect(() => {
    shopAPI.getMenu().then(r => setMenu(r.data)).finally(() => setLoading(false));
  }, []);

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
    toast.success(is_active ? 'Включено' : 'Отключено');
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
        {SECTIONS.map(sec => (
          <MenuSection
            key={sec.key}
            sectionKey={sec.key}
            label={sec.label}
            icon={sec.icon}
            addLabel={sec.addLabel}
            hasColor={sec.hasColor}
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
