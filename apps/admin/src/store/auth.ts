/**
 * Auth session — the app's global client state (Zustand). The access token is
 * held in memory (api.ts); the refresh token is an httpOnly cookie the browser
 * sends automatically. `bootstrap` exchanges that cookie for a fresh access
 * token on load, so a page refresh keeps the user signed in.
 */

import type { Role, User } from '@firecare/types';
import { create } from 'zustand';
import { api, setAccessToken } from '../lib/api';

type Status = 'loading' | 'authed' | 'anon';

interface AuthState {
  user: User | null;
  status: Status;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  bootstrap: async () => {
    try {
      const res = await api.refresh();
      setAccessToken(res.accessToken);
      set({ user: res.user, status: 'authed' });
    } catch {
      setAccessToken(null);
      set({ user: null, status: 'anon' });
    }
  },

  login: async (email, password) => {
    const res = await api.login(email, password);
    setAccessToken(res.accessToken);
    set({ user: res.user, status: 'authed' });
  },

  logout: async () => {
    await api.logout().catch(() => {});
    setAccessToken(null);
    set({ user: null, status: 'anon' });
  },
}));

/** UI convenience — the server still enforces authorization. */
export function useHasRole(...roles: Role[]): boolean {
  return useAuth((s) => !!s.user && roles.includes(s.user.role));
}
