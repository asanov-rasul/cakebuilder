import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cb_token');
      localStorage.removeItem('cb_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Shops (public)
export const shopAPI = {
  getConfig: (slug) => api.get(`/shops/${slug}/config`),
  getMy: () => api.get('/shops/my'),
  updateMy: (data) => api.put('/shops/my', data),
  getMenu: () => api.get('/shops/my/menu'),
  addMenuItem: (type, data) => api.post(`/shops/my/menu/${type}`, data),
  updateMenuItem: (type, id, data) => api.patch(`/shops/my/menu/${type}/${id}`, data),
  deleteMenuItem: (type, id) => api.delete(`/shops/my/menu/${type}/${id}`),
};

// Orders
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getShopOrders: (params) => api.get('/orders/shop', { params }),
  getStats: () => api.get('/orders/shop/stats'),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getShops: () => api.get('/admin/shops'),
  createShop: (data) => api.post('/admin/shops', data),
  updateShop: (id, data) => api.patch(`/admin/shops/${id}`, data),
  deleteShop: (id) => api.delete(`/admin/shops/${id}`),
  getOrders: () => api.get('/admin/orders'),
  getUsers: () => api.get('/admin/users'),
};

export default api;
