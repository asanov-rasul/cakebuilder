import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shopAPI } from '../utils/api';
import useCakeStore from '../store/cakeStore';
import CakeBuilder from '../components/cake-builder/CakeBuilder';
import OrderForm from '../components/cake-builder/OrderForm';
import styles from './ShopPage.module.css';

const BUILDER_STEPS = 6;

export default function ShopPage() {
  const { slug } = useParams();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderComplete, setOrderComplete] = useState(null);
  const { setShopConfig, reset, step } = useCakeStore();

  useEffect(() => {
    loadShop();
    return () => reset();
  }, [slug]);

  const loadShop = async () => {
    try {
      const res = await shopAPI.getConfig(slug);
      setConfig(res.data);
      setShopConfig(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Shop not found');
    } finally {
      setLoading(false);
    }
  };

  const isOrderForm = step > BUILDER_STEPS;

  // Progress: during builder show step/6, during order form show full
  const progressPct = isOrderForm ? 100 : (step / BUILDER_STEPS) * 100;
  const progressLabel = isOrderForm ? 'Almost done!' : `Step ${step} of ${BUILDER_STEPS}`;

  if (loading) return (
    <div className={styles.loading}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p>Loading shop...</p>
    </div>
  );

  if (error) return (
    <div className={styles.errorPage}>
      <div className={styles.errorBox}>
        <div className={styles.errorEmoji}>🍰</div>
        <h2>Shop not found</h2>
        <p>{error}</p>
        <a href="/" className="btn btn-primary mt-4">Back to home</a>
      </div>
    </div>
  );

  if (orderComplete) return (
    <div className={styles.successPage}>
      <div className={styles.successBox}>
        <div className={styles.successEmoji}>🎉</div>
        <h2>Order placed!</h2>
        <p>Your order <strong>#{orderComplete.order_number}</strong> has been received by <strong>{config.shop.name}</strong>.</p>
        <p style={{ fontSize: 14, color: 'var(--gray-400)', marginTop: 8 }}>
          They will contact you at <strong>{orderComplete.customer_phone}</strong> to confirm.
        </p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 24 }}
          onClick={() => { setOrderComplete(null); reset(); }}>
          Order another cake
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Shop header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.shopInfo}>
            <div className={styles.shopAvatar}>{config.shop.name[0]}</div>
            <div>
              <h1 className={styles.shopName}>{config.shop.name}</h1>
              {config.shop.city && <p className={styles.shopCity}>📍 {config.shop.city}</p>}
            </div>
          </div>
          <div className={styles.headerRight}>
            {config.shop.phone && (
              <a href={`tel:${config.shop.phone}`} className={styles.shopPhone}>
                📞 {config.shop.phone}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className={styles.progressWrap}>
        <div className={styles.progressInner}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <span className={styles.progressLabel}>{progressLabel}</span>
        </div>
      </div>

      {/* Main content */}
      <main className={styles.main}>
        {isOrderForm
          ? <OrderForm
              shopId={config.shop.id}
              shopName={config.shop.name}
              onOrderPlaced={setOrderComplete}
              onBack={() => useCakeStore.getState().prevStep()}
            />
          : <CakeBuilder config={config} />
        }
      </main>
    </div>
  );
}
