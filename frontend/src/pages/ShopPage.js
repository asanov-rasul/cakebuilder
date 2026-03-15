import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shopAPI } from '../utils/api';
import useCakeStore from '../store/cakeStore';
import CakeBuilder from '../components/cake-builder/CakeBuilder';
import OrderForm from '../components/cake-builder/OrderForm';
import { useLang, LangSwitcher } from '../i18n';
import styles from './ShopPage.module.css';

const BUILDER_STEPS = 6;

export default function ShopPage() {
  const { slug } = useParams();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderComplete, setOrderComplete] = useState(null);
  const { setShopConfig, reset, step } = useCakeStore();
  const { t } = useLang();
  const S = t.shop;

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
      setError(err.response?.data?.error || S.notFound);
    } finally {
      setLoading(false);
    }
  };

  const isOrderForm = step > BUILDER_STEPS;
  const progressPct = isOrderForm ? 100 : (step / BUILDER_STEPS) * 100;
  const progressLabel = isOrderForm ? S.almostDone : `${S.step} ${step} ${S.of} ${BUILDER_STEPS}`;

  if (loading) return (
    <div className={styles.loading}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p>{S.loading}</p>
    </div>
  );

  if (error) return (
    <div className={styles.errorPage}>
      <div className={styles.errorBox}>
        <div className={styles.errorEmoji}>🍰</div>
        <h2>{S.notFound}</h2>
        <p>{error}</p>
        <a href="/" className="btn btn-primary mt-4">{S.backHome}</a>
      </div>
    </div>
  );

  if (orderComplete) return (
    <div className={styles.successPage}>
      <div className={styles.successBox}>
        <div className={styles.successEmoji}>🎉</div>
        <h2>{S.orderSuccess}</h2>
        <p>{S.orderSuccessDesc} <strong>#{orderComplete.order_number}</strong> {S.orderSuccessDesc2} <strong>{config.shop.name}</strong>.</p>
        <p style={{ fontSize: 14, color: 'var(--gray-400)', marginTop: 8 }}>
          {S.orderSuccessContact} <strong>{orderComplete.customer_phone}</strong> {S.orderSuccessContact2}
        </p>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 24 }}
          onClick={() => { setOrderComplete(null); reset(); }}>
          {S.orderAnother}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.shopBrand}>
            <div className={styles.shopAvatar}>{config.shop.name?.[0]}</div>
            <div>
              <div className={styles.shopName}>{config.shop.name}</div>
              {config.shop.city && <div className={styles.shopCity}>{config.shop.city}</div>}
            </div>
          </div>
          <LangSwitcher />
        </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressBar} style={{ width: `${progressPct}%` }} />
        </div>
        <div className={styles.progressLabel}>{progressLabel}</div>
      </header>

      <main className={styles.main}>
        {isOrderForm
          ? <OrderForm shopId={config.shop.id} shopName={config.shop.name} onOrderPlaced={setOrderComplete} onBack={() => useCakeStore.getState().prevStep()} />
          : <CakeBuilder config={config} />
        }
      </main>
    </div>
  );
}
