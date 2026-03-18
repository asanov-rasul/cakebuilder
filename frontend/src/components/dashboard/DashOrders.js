import React, { useEffect, useState, useCallback, useRef } from 'react';
import { orderAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { useLang } from '../../i18n';
import styles from './DashOrders.module.css';

const STATUS_NEXT = {
  new: 'accepted',
  accepted: 'in_progress',
  in_progress: 'completed',
};

function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
}

function OrderDetailModal({ order, onClose, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const { t } = useLang();
  const OR = t.dashboard.orders;
  const ST = t.statuses;
  const nextStatus = STATUS_NEXT[order.status];

  const STATUS_LABELS = {
    new: ST.new, accepted: ST.accepted, in_progress: ST.in_progress,
    completed: ST.completed, cancelled: ST.cancelled,
  };

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      const res = await orderAPI.updateStatus(order.id, nextStatus);
      onStatusChange(res.data);
      toast.success(`✅ ${OR.markAs} ${STATUS_LABELS[nextStatus]}`);
    } catch { toast.error(OR.updateError); }
    finally { setUpdating(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm(OR.confirmCancel)) return;
    setUpdating(true);
    try {
      const res = await orderAPI.updateStatus(order.id, 'cancelled');
      onStatusChange(res.data);
      toast.success(OR.cancelSuccess);
      onClose();
    } catch { toast.error(OR.cancelError); }
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
            <div className={styles.modalSectionTitle}>{OR.customer}</div>
            <div className={styles.modalRow}><span>{OR.name}</span><strong>{order.customer_name}</strong></div>
            <div className={styles.modalRow}>
              <span>{OR.phone}</span>
              <a href={`tel:${order.customer_phone}`} className={styles.phoneLink}>{order.customer_phone}</a>
            </div>
          </div>

          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>{OR.cake}</div>
            {[
              [OR.cakeShape,   order.cake_shape],
              [OR.cakeSize,    order.cake_size_kg ? `${order.cake_size_kg} kg` : null],
              [OR.cakeFilling, order.cake_filling],
              [OR.cakeCream,   order.cake_cream],
              [OR.cakeDecor,   decorations !== '—' ? decorations : null],
              [OR.cakeText,    order.cake_text],
            ].filter(([, v]) => v).map(([l, v]) => (
              <div key={l} className={styles.modalRow}><span>{l}</span><strong>{v}</strong></div>
            ))}
          </div>

          <div className={styles.modalSection}>
            <div className={styles.modalSectionTitle}>{OR.delivery}</div>
            <div className={styles.modalRow}><span>{OR.received}</span><strong>{fmtDateTime(order.created_at)}</strong></div>
            <div className={styles.modalRow}>
              <span>{OR.date}</span>
              <strong>{fmtDate(order.delivery_date)}{order.delivery_time ? ` ${order.delivery_time}` : ''}</strong>
            </div>
            {order.comment && (
              <div className={styles.modalRow}><span>{OR.note}</span><strong>{order.comment}</strong></div>
            )}
          </div>

          <div className={styles.modalTotal}>
            <span>{t.common.total}</span>
            <span className={styles.modalPrice}>{parseFloat(order.total_price).toFixed(2)} TMT</span>
          </div>
        </div>

        <div className={styles.modalFooter}>
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <button className="btn btn-outline btn-sm" onClick={handleCancel} disabled={updating}>
              {OR.cancelOrder}
            </button>
          )}
          {nextStatus && (
            <button className="btn btn-primary" onClick={handleAdvance} disabled={updating}>
              {updating
                ? <span className="spinner" style={{ width: 16, height: 16 }} />
                : `${OR.markAs} ${STATUS_LABELS[nextStatus]}`}
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
  const prevCountRef = useRef(null);
  const { t } = useLang();
  const OR = t.dashboard.orders;
  const ST = t.statuses;
  const limit = 20;

  const STATUS_LABELS = {
    new: ST.new, accepted: ST.accepted, in_progress: ST.in_progress,
    completed: ST.completed, cancelled: ST.cancelled,
  };

  const STATUSES = [
    { value: '',            label: OR.filterAll },
    { value: 'new',         label: OR.filterNew },
    { value: 'accepted',    label: OR.filterAccepted },
    { value: 'in_progress', label: OR.filterInProgress },
    { value: 'completed',   label: OR.filterCompleted },
    { value: 'cancelled',   label: OR.filterCancelled },
  ];

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await orderAPI.getShopOrders({ status: statusFilter || undefined, page, limit });
      const { orders: newOrders, total: newTotal } = res.data;
      if (prevCountRef.current !== null && newTotal > prevCountRef.current && statusFilter === '') {
        const diff = newTotal - prevCountRef.current;
        toast.success(OR.newOrderToast(diff), { duration: 5000 });
      }
      prevCountRef.current = newTotal;
      setOrders(newOrders);
      setTotal(newTotal);
    } catch {
      if (!silent) toast.error('Error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { setPage(1); }, [statusFilter]);
  useEffect(() => { load(); }, [load]);
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
            {OR.title}
            {newCount > 0 && <span className={styles.newBadge}>{newCount} {OR.newBadge}</span>}
          </h1>
          <p className={styles.sub}>{total} {OR.totalAuto}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => load()}>{OR.refresh}</button>
      </div>

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
          <p>{statusFilter ? `${STATUS_LABELS[statusFilter]}` : OR.noOrders}</p>
          {!statusFilter && <p className={styles.emptyHint}>{OR.noOrdersHint}</p>}
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{OR.colOrder}</th>
                  <th>{OR.colCustomer}</th>
                  <th className={styles.hideSmall}>{OR.colCake}</th>
                  <th className={styles.hideSmall}>{OR.colDelivery}</th>
                  <th>{OR.colPrice}</th>
                  <th>{OR.colStatus}</th>
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
                    <td className={styles.hideSmall}>{fmtDateShort(order.delivery_date)}</td>
                    <td className={styles.priceCell}>{parseFloat(order.total_price).toFixed(2)} TMT</td>
                    <td><span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status]}</span></td>
                    <td><span className={styles.viewBtn}>{OR.view}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{OR.prev}</button>
              <span className={styles.pageInfo}>{OR.page} {page} {OR.of} {totalPages}</span>
              <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>{OR.next}</button>
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
