import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../../utils/api';
import useAuthStore from '../../store/authStore';
import styles from './DashOverview.module.css';

const STATUS_COLORS = {
  new: { bg: '#dbeafe', color: '#1d4ed8', label: 'Новый' },
  accepted: { bg: '#fef3c7', color: '#92400e', label: 'Принят' },
  in_progress: { bg: '#e0e7ff', color: '#3730a3', label: 'В работе' },
  completed: { bg: '#d1fae5', color: '#065f46', label: 'Выполнен' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Отменён' },
};

export default function DashOverview() {
  const { shop } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderAPI.getStats().then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  const trialDaysLeft = shop?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(shop.trial_ends_at) - new Date()) / 86400000))
    : null;

  if (loading) return <div className={styles.loading}><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.sub}>Welcome back! Here's what's happening at {shop?.name}</p>
        </div>
        {shop && (
          <a href={`/shop/${shop.slug}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
            🔗 View shop
          </a>
        )}
      </div>

      {/* Trial banner */}
      {shop?.subscription_status === 'trial' && trialDaysLeft !== null && (
        <div className={styles.trialBanner}>
          <span>⏳ Бесплатный период заканчивается через <strong>{trialDaysLeft} дн.</strong></span>
          <span className={styles.planTag}>{shop.subscription_plan} plan</span>
        </div>
      )}
      {shop?.subscription_status === 'inactive' && (
        <div className={`${styles.trialBanner} ${styles.bannerWarn}`}>
          ⚠️ Ваша подписка неактивна. Обратитесь в поддержку.
        </div>
      )}

      {/* Stats grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📦</div>
          <div className={styles.statNum}>{stats?.total_orders ?? 0}</div>
          <div className={styles.statLabel}>Total orders</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔔</div>
          <div className={styles.statNum}>
            {stats?.status_breakdown?.find(s => s.status === 'new')?.count ?? 0}
          </div>
          <div className={styles.statLabel}>New orders</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statNum}>${(stats?.total_revenue ?? 0).toFixed(0)} ТМТ</div>
          <div className={styles.statLabel}>Total revenue</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📈</div>
          <div className={styles.statNum}>${(stats?.revenue_last_30 ?? 0).toFixed(0)} ТМТ</div>
          <div className={styles.statLabel}>Last 30 days</div>
        </div>
      </div>

      {/* Status breakdown */}
      {stats?.status_breakdown?.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Orders by status</h2>
          <div className={styles.statusGrid}>
            {stats.status_breakdown.map(s => {
              const cfg = STATUS_COLORS[s.status] || { bg: '#f3f4f6', color: '#6b7280', label: s.status };
              return (
                <div key={s.status} className={styles.statusCard} style={{ background: cfg.bg }}>
                  <div className={styles.statusCount} style={{ color: cfg.color }}>{s.count}</div>
                  <div className={styles.statusLabel} style={{ color: cfg.color }}>{cfg.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent orders */}
      {stats?.recent_orders?.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeaderRow}>
            <h2 className={styles.sectionTitle}>Recent orders</h2>
            <Link to="/dashboard/orders" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          <div className={styles.recentList}>
            {stats.recent_orders.map(order => (
              <div key={order.id} className={styles.recentItem}>
                <div className={styles.recentLeft}>
                  <div className={styles.orderNum}>#{order.order_number}</div>
                  <div className={styles.orderMeta}>{order.customer_name} · {order.cake_shape}, {order.cake_size_kg}kg</div>
                </div>
                <div className={styles.recentRight}>
                  <span className={`badge badge-${order.status}`}>
                    {STATUS_COLORS[order.status]?.label || order.status}
                  </span>
                  <span className={styles.orderPrice}>${parseFloat(order.total_price).toFixed(2)} ТМТ</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
