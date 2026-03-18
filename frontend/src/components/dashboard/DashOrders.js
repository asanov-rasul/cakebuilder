import React, { useEffect, useState, useCallback, useRef } from 'react';
import { orderAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import styles from './DashOrders.module.css';

const STATUSES = [
  { value: '', label: 'Все заказы' },
  { value: 'new', label: '🔔 Новые' },
  { value: 'accepted', label: 'Принятые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'completed', label: 'Выполненные' },
  { value: 'cancelled', label: 'Отменённые' },
];

const STATUS_NEXT = {
  new: 'accepted',
  accepted: 'in_progress',
  in_progress: 'completed',
};

const STATUS_LABELS = {
  new: 'Новый', accepted: 'Принят', in_progress: 'В работе',
  completed: 'Выполнен', cancelled: 'Отменён',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const date = dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const time = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}
function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function OrderDetailModal({ order, onClose, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const nextStatus = STATUS_NEXT[order.status];

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      const res = await orderAPI.updateStatus(order.id, nextStatus);
      onStatusChange(res.data);
      toast.success(`✅ Moved to ${STATUS_LABELS[nextStatus]}`);
    } catch { toast.error('Не удалось обновить'); }
    finally { setUpdating(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Отменить этот заказ?')) return;
    setUpdating(true);
    try {
      const res = await orderAPI.updateStatus(order.id, 'cancelled');
      onStatusChange(res.data);
      toast.success('Заказ отменён');
      onClose();
    } catch { toast.error('Не удалось отменить'); }
    finally { setUpdating(false); }
  };

  const decorations = Array.isArray(order.cake_decorations)
    ? order.cake_decorations.join(', ')
    : (order.cake_config?.decorations || []).join(', ') || '—';

  return (
    <div className={styles.modalBackdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.modalOrderNum}>#{order.order_number}</div>
            <span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status]}</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>👤 Customer</div>
            <div className={styles.modalRow}><span>Name</span><strong>{order.customer_name}</strong></div>
            <div className={styles.modalRow}>
              <span>Phone</span>
              <a href={`tel:${order.customer_phone}`} className={styles.phoneLink}>{order.customer_phone}</a>
            </div>
          </div>

          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>🎂 Cake</div>
            {[
              ['Форма', order.cake_shape],
              ['Размер', order.cake_size_kg ? `${order.cake_size_kg} kg` : null],
              ['Начинка', order.cake_filling],
              ['Крем', order.cake_cream],
              ['Украшения', decorations !== '—' ? decorations : null],
              ['Надпись', order.cake_text],
            ].filter(([, v]) => v).map(([l, v]) => (
              <div key={l} className={styles.modalRow}><span>{l}</span><strong>{v}</strong></div>
            ))}
          </div>

          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>📦 Delivery</div>
            <div className={styles.modalRow}><span>Получен</span><strong className={styles.receivedTime}>{fmtDateTime(order.created_at)}</strong></div>
            <div className={styles.modalRow}>
              <span>Date</span>
              <strong>{fmtDate(order.delivery_date)}{order.delivery_time ? ` at ${order.delivery_time}` : ''}</strong>
            </div>
            {order.comment && (
              <div className={styles.modalRow}><span>Note</span><strong>{order.comment}</strong></div>
            )}
          </div>

          <div className={styles.modalTotal}>
            <span>Total</span>
            <span className={styles.modalPrice}>${parseFloat(order.total_price).toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.modalFooter}>
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <button className="btn btn-outline btn-sm" onClick={handleCancel} disabled={updating}>
              Cancel order
            </button>
          )}
          {nextStatus && (
            <button className="btn btn-primary" onClick={handleAdvance} disabled={updating}>
              {updating
                ? <span className="spinner" style={{ width: 16, height: 16 }} />
                : `→ Перевести: ${STATUS_LABELS[nextStatus]}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [lastCount, setLastCount] = useState(null);
  const prevCountRef = useRef(null);
  const limit = 20;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await orderAPI.getShopOrders({ status: statusFilter || undefined, page, limit });
      const { orders: newOrders, total: newTotal } = res.data;

      // Notify of new orders since last poll
      if (prevCountRef.current !== null && newTotal > prevCountRef.current && statusFilter === '') {
        const diff = newTotal - prevCountRef.current;
        toast.success(`🔔 ${diff} новых заказа получено!`, { duration: 5000 });
      }
      prevCountRef.current = newTotal;

      setOrders(newOrders);
      setTotal(newTotal);
    } catch {
      if (!silent) toast.error('Не удалось загрузить заказы');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, page]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [statusFilter]);

  // Load on mount and when deps change
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds to catch new orders
  useEffect(() => {
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleStatusChange = (updated) => {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
  };

  const totalPages = Math.ceil(total / limit);

  const newCount = orders.filter(o => o.status === 'new').length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>
            Orders
            {newCount > 0 && <span className={styles.newBadge}>{newCount} new</span>}
          </h1>
          <p className={styles.sub}>{total} total · auto-refreshes every 30s</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => load()} title="Refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className={styles.filters}>
        {STATUSES.map(s => (
          <button
            key={s.value}
            className={`${styles.filterBtn} ${statusFilter === s.value ? styles.filterActive : ''}`}
            onClick={() => setStatusFilter(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loadingWrap}><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyEmoji}>📭</div>
          <p>{statusFilter ? `Нет заказов: ${STATUS_LABELS[statusFilter]?.toLowerCase()}` : 'Заказов пока нет'}</p>
          {!statusFilter && (
            <p className={styles.emptyHint}>Orders placed from your shop page will appear here in real time.</p>
          )}
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Заказ</th>
                  <th>Клиент</th>
                  <th className={styles.hideSmall}>Торт</th>
                  <th className={styles.hideSmall}>Доставка</th>
                  <th>Цена</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr
                    key={order.id}
                    className={`${styles.row} ${order.status === 'new' ? styles.rowNew : ''}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td>
                      <div className={styles.orderNumCell}>#{order.order_number}</div>
                      <div className={styles.orderDate}>{fmtDateTime(order.created_at)}</div>
                    </td>
                    <td>
                      <div className={styles.customerName}>{order.customer_name}</div>
                      <div className={styles.customerPhone}>{order.customer_phone}</div>
                    </td>
                    <td className={styles.hideSmall}>
                      <div className={styles.cakeDesc}>
                        {[order.cake_shape, order.cake_size_kg && `${order.cake_size_kg}kg`, order.cake_filling]
                          .filter(Boolean).join(' · ')}
                      </div>
                      {order.cake_text && <div className={styles.cakeText}>"{order.cake_text}"</div>}
                    </td>
                    <td className={styles.hideSmall}>
                      {fmtDateShort(order.delivery_date)}
                    </td>
                    <td className={styles.priceCell}>${parseFloat(order.total_price).toFixed(2)}</td>
                    <td>
                      <span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status]}</span>
                    </td>
                    <td>
                      <span className={styles.viewBtn}>Смотреть →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
