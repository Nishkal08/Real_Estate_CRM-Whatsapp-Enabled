import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios'; // use regular axios for auth calls to avoid circular dependency with api.js

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

/**
 * Auth Store — user session state
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await axios.post(`${apiBaseUrl}/auth/login`, { email, password });
          const { user, accessToken, refreshToken } = res.data.data;
          
          set({
            isAuthenticated: true,
            isLoading: false,
            user,
            token: accessToken,
            refreshToken,
          });
          return { success: true };
        } catch (err) {
          const message = err.response?.data?.error || err.message;
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      register: async (name, email, password, businessName) => {
        set({ isLoading: true, error: null });
        try {
          const res = await axios.post(`${apiBaseUrl}/auth/register`, { name, email, password, businessName });
          const { user, accessToken, refreshToken } = res.data.data;
          
          set({
            isAuthenticated: true,
            isLoading: false,
            user,
            token: accessToken,
            refreshToken,
          });
          return { success: true };
        } catch (err) {
          const message = err.response?.data?.error || err.message;
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      updateUser: (updates) => {
        set((state) => ({ user: { ...state.user, ...updates } }));
      },

      updateProfileOnServer: async (name, email) => {
        set({ isLoading: true, error: null });
        try {
          const token = get().token;
          if (!token) throw new Error("No authorization token");
          
          const res = await axios.put(`${apiBaseUrl}/auth/me`, { name, email }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const updatedUser = res.data.data;
          set({ user: updatedUser, isLoading: false });
          return { success: true, user: updatedUser };
        } catch (err) {
          const message = err.response?.data?.error || err.message;
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      setToken: (token, refreshToken) => {
        set({ token, refreshToken });
      },

      clearError: () => set({ error: null }),
      
      // Load profile
      loadProfile: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const res = await axios.get(`${apiBaseUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          set({ user: res.data.data });
        } catch (err) {
          console.error("Failed to load profile", err);
          if (err.response?.status === 401) {
            get().logout();
          }
        }
      }
    }),
    {
      name: 'ai-ops-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
