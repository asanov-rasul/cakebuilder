import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { adminAPI } from '../utils/api';
import { toast } from 'react-hot-toast';
import styles from './AdminDashboard.module.css';

// ── Sidebar ──────────────────────────────────────────
const NAV = [
  { path: 'overview', label: 'Overview', icon: '📊' },
  { path: 'shops', label: 'Shops', icon: '🏪' },
  { path: 'orders', label: 'All Orders', icon: '📦' },
  { path: 'users', label: 'Users', icon: '👥' },
];

function AdminSidebar({ onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.brandLogo}>🍰</div>
        <div>
          <div className={styles.brandName}>CakeBuilder</div>
          <div className={styles.brandSub}>Admin Panel</div>
        </div>
      </div>
      <nav className={styles.nav}>
        {NAV.map(item => (
          <NavLink key={item.path} to={`/admin/${item.path}`}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
            onClick={onClose}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <div className={styles.adminInfo}>
          <div className={styles.adminAvatar}>{user?.full_name?.[0]}</div>
          <div>
            <div className={styles.adminName}>{user?.full_name}</div>
            <div className={styles.adminRole}>Platform Admin</div>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
          🚪 Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Overview ─────────────────────────────────────────
function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminAPI.getStats().then(r => setStats(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className={styles.centered}><div className="spinner" /></div>;
  const breakdown = Object.fromEntries((stats.subscription_breakdown || []).map(b => [b.subscription_status, b.count]));
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Platform overview</h1>
      <div className={styles.statsGrid}>
        {[
          { icon: '🏪', num: stats.total_shops, sub: `${stats.active_shops} active`, label: 'Total shops' },
          { icon: '📦', num: stats.total_orders, label: 'Total orders' },
          { icon: '👥', num: stats.total_users, label: 'Registered users' },
          { icon: '💰', num: `$${parseFloat(stats.platform_revenue || 0).toFixed(0)}`, label: 'Platform revenue' },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statNum}>{s.num}</div>
            <div className={styles.statLabel}>{s.label}</div>
            {s.sub && <div className={styles.statSub}>{s.sub}</div>}
          </div>
        ))}
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Subscription breakdown</div>
        <div className={styles.subBreakdown}>
          {[
            { key: 'trial', label: 'Trial', color: '#fef3c7', text: '#92400e' },
            { key: 'active', label: 'Active', color: '#d1fae5', text: '#065f46' },
            { key: 'inactive', label: 'Inactive', color: '#f3f4f6', text: '#6b7280' },
            { key: 'expired', label: 'Expired', color: '#fee2e2', text: '#991b1b' },
          ].map(s => (
            <div key={s.key} className={styles.subChip} style={{ background: s.color }}>
              <span className={styles.subChipNum} style={{ color: s.text }}>{breakdown[s.key] || 0}</span>
              <span className={styles.subChipLabel} style={{ color: s.text }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shops ─────────────────────────────────────────────
const SUB_STATUS_OPTIONS = ['trial', 'active', 'inactive', 'expired'];
const PLAN_OPTIONS = ['starter', 'business'];

const EMPTY_CREATE = {
  owner_full_name: '', owner_email: '', owner_password: '', owner_phone: '',
  shop_name: '', shop_slug: '', shop_description: '', shop_city: '',
  shop_address: '', shop_phone: '', shop_email: '',
  price_per_kg_base: '15', subscription_plan: 'starter', subscription_status: 'trial',
};

const EMPTY_EDIT = {
  name: '', description: '', city: '', address: '', phone: '', email: '',
  price_per_kg_base: '', subscription_plan: 'starter', subscription_status: 'trial', is_active: true,
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Modal создания магазина
function CreateShopModal({ onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY_CREATE);
  const [saving, setSaving] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleShopName = (v) => {
    set('shop_name', v);
    if (!slugEdited) set('shop_slug', slugify(v));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreate(form);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth: 560 }}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>🏪 Новый магазин</div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>

            <div className={styles.modalSectionTitle}>Владелец</div>
            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label">Имя *</label>
                <input className="form-input" required placeholder="Иван Иванов"
                  value={form.owner_full_name} onChange={e => set('owner_full_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Телефон</label>
                <input className="form-input" placeholder="+7 900 000 00 00"
                  value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" required type="email" placeholder="owner@shop.com"
                  value={form.owner_email} onChange={e => set('owner_email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Пароль *</label>
                <input className="form-input" required minLength={6} placeholder="Минимум 6 символов"
                  value={form.owner_password} onChange={e => set('owner_password', e.target.value)} />
              </div>
            </div>

            <div className={styles.modalSectionTitle} style={{ marginTop: 20 }}>Магазин</div>
            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label">Название *</label>
                <input className="form-input" required placeholder="Sweet Cake"
                  value={form.shop_name} onChange={e => handleShopName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">URL магазина *</label>
                <div className={styles.slugRow}>
                  <span className={styles.slugPre}>/shop/</span>
                  <input className="form-input" required placeholder="sweetcake"
                    style={{ borderRadius: '0 var(--radius) var(--radius) 0', borderLeft: 'none' }}
                    value={form.shop_slug}
                    onChange={e => { setSlugEdited(true); set('shop_slug', slugify(e.target.value)); }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Город</label>
                <input className="form-input" placeholder="Москва"
                  value={form.shop_city} onChange={e => set('shop_city', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Цена за кг ($)</label>
                <input className="form-input" type="number" min="1" step="0.5"
                  value={form.price_per_kg_base} onChange={e => set('price_per_kg_base', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Тариф</label>
                <select className="form-input" value={form.subscription_plan} onChange={e => set('subscription_plan', e.target.value)}>
                  <option value="starter">Starter</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Статус подписки</label>
                <select className="form-input" value={form.subscription_status} onChange={e => set('subscription_status', e.target.value)}>
                  <option value="trial">Trial (пробный)</option>
                  <option value="active">Active (активный)</option>
                  <option value="inactive">Inactive (неактивный)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Описание</label>
              <textarea className="form-input" placeholder="Описание кондитерской..."
                value={form.shop_description} onChange={e => set('shop_description', e.target.value)} />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : '🏪 Создать магазин'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal редактирования магазина
function EditShopModal({ shop, onClose, onSave }) {
  const [form, setForm] = useState({
    name: shop.name || '',
    description: shop.description || '',
    city: shop.city || '',
    address: shop.address || '',
    phone: shop.phone || '',
    email: shop.email || '',
    price_per_kg_base: shop.price_per_kg_base || '15',
    subscription_plan: shop.subscription_plan || 'starter',
    subscription_status: shop.subscription_status || 'trial',
    is_active: shop.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(shop.id, form);
      onClose();
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth: 520 }}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>✏️ {shop.name}</div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label">Название магазина</label>
                <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Город</label>
                <input className="form-input" placeholder="Москва" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Телефон</label>
                <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Цена за кг ($)</label>
                <input className="form-input" type="number" min="1" step="0.5"
                  value={form.price_per_kg_base} onChange={e => set('price_per_kg_base', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Тариф</label>
                <select className="form-input" value={form.subscription_plan} onChange={e => set('subscription_plan', e.target.value)}>
                  <option value="starter">Starter</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Статус подписки</label>
                <select className="form-input" value={form.subscription_status} onChange={e => set('subscription_status', e.target.value)}>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Видимость</label>
                <select className="form-input" value={form.is_active ? 'true' : 'false'}
                  onChange={e => set('is_active', e.target.value === 'true')}>
                  <option value="true">✓ Активен</option>
                  <option value="false">✗ Отключён</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Адрес</label>
              <input className="form-input" placeholder="ул. Пушкина, д. 1" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Описание</label>
              <textarea className="form-input" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className={styles.shopUrlInfo}>
              🔗 URL магазина: <strong>/shop/{shop.slug}</strong>
              <a href={`/shop/${shop.slug}`} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: 'var(--rose)' }}>Открыть →</a>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editShop, setEditShop] = useState(null);

  useEffect(() => { adminAPI.getShops().then(r => setShops(r.data)).finally(() => setLoading(false)); }, []);

  const handleCreate = async (data) => {
    const res = await adminAPI.createShop(data);
    const newShop = {
      ...res.data.shop,
      owner_name: res.data.user.full_name,
      owner_email: res.data.user.email,
      total_orders: 0,
    };
    setShops(prev => [newShop, ...prev]);
    toast.success(`Магазин "${newShop.name}" создан!`);
  };

  const handleSave = async (id, data) => {
    const res = await adminAPI.updateShop(id, data);
    setShops(prev => prev.map(s => s.id === id ? { ...s, ...res.data } : s));
    toast.success('Сохранено');
  };

  const handleDelete = async (shop) => {
    if (!window.confirm(`Удалить магазин "${shop.name}" и все его данные? Это действие необратимо.`)) return;
    try {
      await adminAPI.deleteShop(shop.id);
      setShops(prev => prev.filter(s => s.id !== shop.id));
      toast.success('Магазин удалён');
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const filtered = shops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.owner_email?.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className={styles.centered}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeaderRow}>
        <h1 className={styles.title}>Магазины <span className={styles.count}>{shops.length}</span></h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="form-input" placeholder="Поиск..." style={{ maxWidth: 220 }}
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Новый магазин
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Магазин</th>
              <th>Владелец</th>
              <th className={styles.hideSmall}>Заказы</th>
              <th>Тариф</th>
              <th>Статус</th>
              <th>Активен</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(shop => (
              <tr key={shop.id} className={styles.row}>
                <td>
                  <div className={styles.shopName}>{shop.name}</div>
                  <div className={styles.shopSlug}>/{shop.slug}</div>
                </td>
                <td>
                  <div className={styles.ownerName}>{shop.owner_name}</div>
                  <div className={styles.ownerEmail}>{shop.owner_email}</div>
                </td>
                <td className={styles.hideSmall}>
                  <span className={styles.orderCount}>{shop.total_orders}</span>
                </td>
                <td>
                  <select className={styles.selectInline} value={shop.subscription_plan}
                    onChange={e => handleSave(shop.id, { subscription_plan: e.target.value })}>
                    {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </td>
                <td>
                  <select className={`${styles.selectInline} ${styles[`status_${shop.subscription_status}`]}`}
                    value={shop.subscription_status}
                    onChange={e => handleSave(shop.id, { subscription_status: e.target.value })}>
                    {SUB_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </td>
                <td>
                  <button className={`${styles.toggleActive} ${shop.is_active ? styles.toggleOn : styles.toggleOff}`}
                    onClick={() => handleSave(shop.id, { is_active: !shop.is_active })}>
                    {shop.is_active ? '✓' : '✗'}
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditShop(shop)}>✏️</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}
                      onClick={() => handleDelete(shop)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateShopModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
      {editShop && (
        <EditShopModal shop={editShop} onClose={() => setEditShop(null)} onSave={handleSave} />
      )}
    </div>
  );
}

// ── All Orders ────────────────────────────────────────
function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminAPI.getOrders().then(r => setOrders(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className={styles.centered}><div className="spinner" /></div>;
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>All orders <span className={styles.count}>{orders.length}</span></h1>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Shop</th>
              <th>Customer</th>
              <th className={styles.hideSmall}>Cake</th>
              <th>Price</th>
              <th>Status</th>
              <th className={styles.hideSmall}>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className={styles.row}>
                <td><div className={styles.mono}>#{o.order_number}</div></td>
                <td><div className={styles.shopName}>{o.shop_name}</div></td>
                <td>
                  <div className={styles.ownerName}>{o.customer_name}</div>
                  <div className={styles.ownerEmail}>{o.customer_phone}</div>
                </td>
                <td className={styles.hideSmall}>
                  <div className={styles.cakeDesc}>
                    {[o.cake_shape, o.cake_size_kg && `${o.cake_size_kg}kg`, o.cake_filling].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td><div className={styles.price}>${parseFloat(o.total_price).toFixed(2)}</div></td>
                <td><span className={`badge badge-${o.status}`}>{o.status.replace('_', ' ')}</span></td>
                <td className={styles.hideSmall}>
                  <div className={styles.date}>{new Date(o.created_at).toLocaleDateString()}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Users ─────────────────────────────────────────────
function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { adminAPI.getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className={styles.centered}><div className="spinner" /></div>;
  const byRole = { admin: [], shop_owner: [], customer: [] };
  users.forEach(u => (byRole[u.role] || []).push(u));
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Users <span className={styles.count}>{users.length}</span></h1>
      <div className={styles.roleGrid}>
        {[
          { key: 'shop_owner', label: 'Shop Owners', icon: '🏪' },
          { key: 'customer', label: 'Customers', icon: '👤' },
          { key: 'admin', label: 'Admins', icon: '🛡️' },
        ].map(({ key, label, icon }) => (
          <div key={key} className={styles.card}>
            <div className={styles.cardTitle}>{icon} {label} ({byRole[key]?.length || 0})</div>
            <div className={styles.userList}>
              {byRole[key]?.length === 0 && <div className={styles.noUsers}>None</div>}
              {byRole[key]?.map(u => (
                <div key={u.id} className={styles.userRow}>
                  <div className={styles.userAvatar}>{u.full_name?.[0]}</div>
                  <div>
                    <div className={styles.userName}>{u.full_name}</div>
                    <div className={styles.userEmail}>{u.email}</div>
                  </div>
                  <div className={styles.userDate}>
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────
export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className={styles.layout}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}
      <AdminSidebar onClose={() => setSidebarOpen(false)} />
      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className={styles.topbarTitle}>Admin</div>
        </header>
        <div className={styles.content}>
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<AdminOverview />} />
            <Route path="shops" element={<AdminShops />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
