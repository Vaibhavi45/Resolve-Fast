import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({

      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hydrated: false,
      setAuth: (user, accessToken, refreshToken) => {
        // Handle both access_token and accessToken formats
        const token = accessToken || (user as any)?.access_token;
        const refresh = refreshToken || (user as any)?.refresh_token;
        set({ 
          user, 
          accessToken: token, 
          refreshToken: refresh, 
          isAuthenticated: true,
          hydrated: true // Ensure hydrated is set when auth is set
        });
      },
      clearAuth: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'auth-session',
      // Use sessionStorage instead of localStorage to prevent cross-tab conflicts
      storage: {
        getItem: (name: string) => {
          if (typeof window === 'undefined') return null;
          try {
            const value = window.sessionStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch {
            return null;
          }
        },
        setItem: (name: string, value: any) => {
          if (typeof window === 'undefined') return;
          try {
            window.sessionStorage.setItem(name, JSON.stringify(value));
          } catch {
            // Ignore storage errors
          }
        },
        removeItem: (name: string) => {
          if (typeof window === 'undefined') return;
          try {
            window.sessionStorage.removeItem(name);
          } catch {
            // Ignore storage errors
          }
        },
      },
      onRehydrateStorage: () => (state) => {
        // Return the state with hydrated set to true
        if (state) {
          state.hydrated = true;
        }
        return state;
      },
    }
  )
);
