import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { adminAPI } from '../utils/api';
import { toast } from 'react-hot-toast';
import { useLang, LangSwitcher } from '../i18n';
import styles from './AdminDashboard.module.css';

function AdminSidebar({ onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLang();
  const AD = t.admin;

  const NAV = [
    { path: 'overview', label: AD.nav.overview, icon: '📊' },
    { path: 'shops',    label: AD.nav.shops,    icon: '🏪' },
    { path: 'orders',   label: AD.nav.orders,   icon: '📦' },
    { path: 'users',    label: AD.nav.users,    icon: '👥' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.brandLogo}>🍰</div>
        <div>
          <div className={styles.brandName}>CakeBuilder</div>
          <div className={styles.brandSub}>{AD.brand}</div>
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
        <LangSwitcher />
        <button className={styles.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
          {t.common.signOut}
        </button>
      </div>
    </aside>
  );
}

function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLang();
  const OV = t.admin.overview;

  useEffect(() => { adminAPI.getStats().then(r => setStats(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className={styles.centered}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{OV.title}</h1>
      <div className={styles.statsGrid}>
        {[
          { icon: '🏪', num: stats.total_shops,  sub: `${stats.active_shops} ${OV.active}`, label: OV.totalShops },
          { icon: '📦', num: stats.total_orders,  label: OV.totalOrders },
          { icon: '👥', num: stats.total_users,   label: OV.totalUsers },
          { icon: '💰', num: `${parseFloat(stats.platform_revenue || 0).toFixed(0)}`, label: OV.revenue },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statNum}>{s.num}</div>
            <div className={styles.statLabel}>{s.label}</div>
            {s.sub && <div className={styles.statSub}>{s.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLang();
  const SH = t.admin.shops;
  const ST = t.statuses;

  useEffect(() => { adminAPI.getShops().then(r => setShops(r.data)).finally(() => setLoading(false)); }, []);

  const toggleActive = async (shop) => {
    try {
      const res = await adminAPI.updateShop(shop.id, { is_active: !shop.is_active });
      setShops(prev => prev.map(s => s.id === shop.id ? res.data : s));
    } catch { toast.error('Error'); }
  };

  if (loading) return <div className={styles.centered}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{SH.title}</h1>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr>
            <th>{SH.colName}</th><th>{SH.colOwner}</th>
            <th>{SH.colPlan}</th><th>{SH.colStatus}</th>
            <th>{SH.colOrders}</th><th>{SH.colActions}</th>
          </tr></thead>
          <tbody>
            {shops.map(shop => (
              <tr key={shop.id}>
                <td><div className={styles.shopName}>{shop.name}</div><div className={styles.shopSlug}>/{shop.slug}</div></td>
                <td><div>{shop.owner_name}</div><div className={styles.shopSlug}>{shop.owner_email}</div></td>
                <td><span className={`badge badge-${shop.subscription_status}`}>{shop.subscription_plan}</span></td>
                <td><span className={`badge ${shop.is_active ? 'badge-completed' : 'badge-cancelled'}`}>{shop.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>{shop.order_count || 0}</td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => toggleActive(shop)}>
                    {shop.is_active ? SH.deactivate : SH.activate}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLang();
  const OR = t.admin.orders;
  const ST = t.statuses;

  useEffect(() => { adminAPI.getOrders().then(r => setOrders(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className={styles.centered}><div className="spinner" /></div>;

  const STATUS_LABELS = { new: ST.new, accepted: ST.accepted, in_progress: ST.in_progress, completed: ST.completed, cancelled: ST.cancelled };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{OR.title}</h1>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr>
            <th>{OR.colOrder}</th><th>{OR.colShop}</th>
            <th>{OR.colCustomer}</th><th>{OR.colCake}</th>
            <th>{OR.colPrice}</th><th>{OR.colStatus}</th>
          </tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td>#{o.order_number}</td>
                <td>{o.shop_name}</td>
                <td><div>{o.customer_name}</div><div className={styles.shopSlug}>{o.customer_phone}</div></td>
                <td>{[o.cake_shape, o.cake_size_kg && `${o.cake_size_kg}kg`].filter(Boolean).join(', ')}</td>
                <td>{parseFloat(o.total_price).toFixed(2)} TMT</td>
                <td><span className={`badge badge-${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLang();
  const US = t.admin.users;

  useEffect(() => { adminAPI.getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className={styles.centered}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{US.title}</h1>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr>
            <th>{US.colName}</th><th>{US.colEmail}</th>
            <th>{US.colRole}</th><th>{US.colCreated}</th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td><span className={`badge badge-${u.role === 'admin' ? 'new' : 'accepted'}`}>{u.role}</span></td>
                <td>{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}
      <AdminSidebar onClose={() => setSidebarOpen(false)} />
      <div className={styles.content}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>☰</button>
        </header>
        <main className={styles.main}>
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<AdminOverview />} />
            <Route path="shops"    element={<AdminShops />} />
            <Route path="orders"   element={<AdminOrders />} />
            <Route path="users"    element={<AdminUsers />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
