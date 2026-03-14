import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import DashOverview from '../components/dashboard/DashOverview';
import DashOrders   from '../components/dashboard/DashOrders';
import DashMenu     from '../components/dashboard/DashMenu';
import DashPricing  from '../components/dashboard/DashPricing';
import DashProfile  from '../components/dashboard/DashProfile';
import { useLang, LangSwitcher } from '../i18n';
import styles from './ShopDashboard.module.css';

export default function ShopDashboard() {
  const { user, shop, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLang();
  const D = t.dashboard;

  const NAV = [
    { path: 'overview', label: D.nav.overview, icon: '📊' },
    { path: 'orders',   label: D.nav.orders,   icon: '📦' },
    { path: 'menu',     label: D.nav.menu,     icon: '🍽️' },
    { path: 'pricing',  label: D.nav.pricing,  icon: '💰' },
    { path: 'profile',  label: D.nav.profile,  icon: '🏪' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={styles.layout}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brandLogo}>🍰</div>
          <div>
            <div className={styles.brandName}>CakeBuilder</div>
            <div className={styles.brandSub}>{D.brand}</div>
          </div>
        </div>

        {shop && (
          <div className={styles.shopInfo}>
            <div className={styles.shopAvatar}>{shop.name?.[0] || '?'}</div>
            <div className={styles.shopDetails}>
              <div className={styles.shopName}>{shop.name}</div>
              <div className={styles.shopSlug}>/{shop.slug}</div>
            </div>
          </div>
        )}

        <nav className={styles.nav}>
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={`/dashboard/${item.path}`}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {shop && (
            <a href={`/shop/${shop.slug}`} target="_blank" rel="noopener noreferrer" className={styles.viewShopBtn}>
              🔗 {t.common.viewShop}
            </a>
          )}
          <div style={{ padding: '6px 0' }}>
            <LangSwitcher />
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            🚪 {t.nav.logout}
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className={styles.topbarRight}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>{user?.full_name?.[0] || 'U'}</div>
              <span className={styles.userName}>{user?.full_name}</span>
            </div>
          </div>
        </header>
        <div className={styles.content}>
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<DashOverview />} />
            <Route path="orders"   element={<DashOrders />} />
            <Route path="menu"     element={<DashMenu />} />
            <Route path="pricing"  element={<DashPricing />} />
            <Route path="profile"  element={<DashProfile />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
