import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import './styles/global.css';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ShopPage from './pages/ShopPage';
import ShopDashboard from './pages/ShopDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Route guards
function PrivateRoute({ children, role }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <div className="page-loader"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <div className="page-loader"><div className="spinner" /></div>;
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'shop_owner') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const { init } = useAuthStore();

  useEffect(() => {
    init();
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '10px' },
          success: { iconTheme: { primary: '#6b8f71', secondary: '#fff' } },
          error: { iconTheme: { primary: '#e8614a', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="/shop/:slug" element={<ShopPage />} />
        <Route
          path="/dashboard/*"
          element={<PrivateRoute role="shop_owner"><ShopDashboard /></PrivateRoute>}
        />
        <Route
          path="/admin/*"
          element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
