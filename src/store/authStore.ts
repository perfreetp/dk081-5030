import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../../shared/types.js';

interface AuthState {
  token: string | null;
  user: Omit<User, 'password'> | null;
  isAuthenticated: boolean;
  login: (token: string, user: Omit<User, 'password'>) => void;
  logout: () => void;
  updateUser: (user: Partial<Omit<User, 'password'>>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      }))
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
