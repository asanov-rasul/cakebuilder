import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import DashOverview from '../components/dashboard/DashOverview';
import DashOrders from '../components/dashboard/DashOrders';
import DashMenu from '../components/dashboard/DashMenu';
import DashPricing from '../components/dashboard/DashPricing';
import DashProfile from '../components/dashboard/DashProfile';
import styles from './ShopDashboard.module.css';

const NAV = [
  { path: 'overview', label: 'Обзор', icon: '📊' },
  { path: 'orders', label: 'Заказы', icon: '📦' },
  { path: 'menu', label: 'Меню', icon: '🍽️' },
  { path: 'pricing', label: 'Цены', icon: '💰' },
  { path: 'profile', label: 'Профиль', icon: '🏪' },
];

export default function ShopDashboard() {
  const { user, shop, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      {/* Mobile overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brandLogo}>🍰</div>
          <div>
            <div className={styles.brandName}>CakeBuilder</div>
            <div className={styles.brandSub}>Shop Dashboard</div>
          </div>
        </div>

        {/* Shop info */}
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
            <a
              href={`/shop/${shop.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewShopBtn}
            >
              🔗 View my shop
            </a>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            🚪 Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
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
            <Route path="orders" element={<DashOrders />} />
            <Route path="menu" element={<DashMenu />} />
            <Route path="pricing" element={<DashPricing />} />
            <Route path="profile" element={<DashProfile />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
