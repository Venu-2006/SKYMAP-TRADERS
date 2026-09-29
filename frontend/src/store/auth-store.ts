import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Session, User } from '@/lib/types';

interface AuthState {
  user: User | null;
  /** Kept in memory only — never persisted, so XSS can't lift it from storage. */
  accessToken: string | null;
  /** Double-submit CSRF value, echoed as X-CSRF-Token on cookie-authenticated calls. */
  csrfToken: string | null;
  /** True once the initial silent refresh has finished. */
  hydrated: boolean;
  setSession: (s: Session) => void;
  setUser: (u: User) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      csrfToken: null,
      hydrated: false,
      setSession: ({ user, accessToken, csrfToken }) => set({ user, accessToken, csrfToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, accessToken: null, csrfToken: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'skymap-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user, csrfToken: s.csrfToken }),
    },
  ),
);
