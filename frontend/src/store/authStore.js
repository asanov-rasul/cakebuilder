import { create } from 'zustand';
import { authAPI } from '../utils/api';

const useAuthStore = create((set, get) => ({
  user: null,
  shop: null,
  token: localStorage.getItem('cb_token'),
  loading: true,
  initialized: false,

  init: async () => {
    const token = localStorage.getItem('cb_token');
    if (!token) {
      set({ loading: false, initialized: true });
      return;
    }
    try {
      const res = await authAPI.me();
      set({ user: res.data.user, shop: res.data.shop, loading: false, initialized: true });
    } catch {
      localStorage.removeItem('cb_token');
      set({ user: null, token: null, loading: false, initialized: true });
    }
  },

  login: async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, user } = res.data;
    localStorage.setItem('cb_token', token);
    // Fetch full data including shop
    const meRes = await authAPI.me();
    set({ user: meRes.data.user, shop: meRes.data.shop, token });
    return meRes.data.user;
  },

  register: async (data) => {
    const res = await authAPI.register(data);
    const { token, user } = res.data;
    localStorage.setItem('cb_token', token);
    const meRes = await authAPI.me();
    set({ user: meRes.data.user, shop: meRes.data.shop, token });
    return meRes.data.user;
  },

  logout: () => {
    localStorage.removeItem('cb_token');
    set({ user: null, shop: null, token: null });
  },

  setShop: (shop) => set({ shop }),
}));

export default useAuthStore;
