import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import './styles/global.css';
import { LangProvider } from './i18n';

// Each page is its own chunk: a customer opening /shop/:slug no longer
// downloads the owner dashboard and the admin panel.
const LandingPage    = lazy(() => import('./pages/LandingPage'));
const LoginPage      = lazy(() => import('./pages/LoginPage'));
const RegisterPage   = lazy(() => import('./pages/RegisterPage'));
const ShopPage       = lazy(() => import('./pages/ShopPage'));
const ShopDashboard  = lazy(() => import('./pages/ShopDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const Loader = () => <div className="page-loader"><div className="spinner" /></div>;

function PrivateRoute({ children, role }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  if (!initialized) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  if (!initialized) return <Loader />;
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'shop_owner') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);

  return (
    <LangProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '10px' },
            success: { iconTheme: { primary: '#6b8f71', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#e8614a', secondary: '#fff' } },
          }}
        />
        <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/"           element={<LandingPage />} />
          <Route path="/login"      element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register"   element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/shop/:slug" element={<ShopPage />} />
          <Route path="/dashboard/*" element={<PrivateRoute role="shop_owner"><ShopDashboard /></PrivateRoute>} />
          <Route path="/admin/*"    element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </LangProvider>
  );
}
