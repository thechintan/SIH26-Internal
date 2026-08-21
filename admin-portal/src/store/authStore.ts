import { create } from 'zustand';
import { User, UserRole } from '../types/auth';
import { authApi } from '../api/auth.api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (data: { user: User; accessToken: string; refreshToken: string }) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem('civicpulse_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  accessToken: localStorage.getItem('civicpulse_access_token'),
  refreshToken: localStorage.getItem('civicpulse_refresh_token'),
  isAuthenticated: !!localStorage.getItem('civicpulse_access_token'),
  isLoading: true,

  setAuth: ({ user, accessToken, refreshToken }) => {
    localStorage.setItem('civicpulse_access_token', accessToken);
    localStorage.setItem('civicpulse_refresh_token', refreshToken);
    localStorage.setItem('civicpulse_user', JSON.stringify(user));
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('civicpulse_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('civicpulse_refresh_token', refreshToken);
    }
    set({
      accessToken,
      ...(refreshToken && { refreshToken }),
      isAuthenticated: true,
    });
  },

  setUser: (user) => {
    localStorage.setItem('civicpulse_user', JSON.stringify(user));
    set({ user });
  },

  logout: async () => {
    try {
      if (get().accessToken) {
        await authApi.logout();
      }
    } catch (e) {
      console.warn('Backend logout failed:', e);
    } finally {
      localStorage.removeItem('civicpulse_access_token');
      localStorage.removeItem('civicpulse_refresh_token');
      localStorage.removeItem('civicpulse_user');
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  initAuth: async () => {
    const token = localStorage.getItem('civicpulse_access_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const user = await authApi.getCurrentUser();
      localStorage.setItem('civicpulse_user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      console.warn('Failed to fetch current user profile:', err);
      // Check if user is cached in local storage
      const cached = localStorage.getItem('civicpulse_user');
      if (cached) {
        set({ user: JSON.parse(cached), isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },
}));

// Listen to custom logout event dispatched by client.ts on token expiration
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout();
  });
}
