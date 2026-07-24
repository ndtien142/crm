/**
 * Session state. On mount it tries to exchange a persisted refresh token for a
 * fresh access token (survives reloads); `login`/`logout` manage the lifecycle.
 * The access token stays in memory (api.ts); only the refresh token is persisted.
 */

import type { Role, User } from '@firecare/types';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setAccessToken } from './api';

const REFRESH_KEY = 'firecare.refresh';

type Status = 'loading' | 'authed' | 'anon';

interface SessionValue {
  user: User | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) {
      setStatus('anon');
      return;
    }
    api
      .refresh(refresh)
      .then((res) => {
        setAccessToken(res.accessToken);
        localStorage.setItem(REFRESH_KEY, res.refreshToken);
        setUser(res.user);
        setStatus('authed');
      })
      .catch(() => {
        localStorage.removeItem(REFRESH_KEY);
        setAccessToken(null);
        setStatus('anon');
      });
  }, []);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    setAccessToken(res.accessToken);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    setUser(res.user);
    setStatus('authed');
  }

  async function logout() {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (refresh) await api.logout(refresh).catch(() => {});
    localStorage.removeItem(REFRESH_KEY);
    setAccessToken(null);
    setUser(null);
    setStatus('anon');
  }

  return (
    <SessionContext.Provider value={{ user, status, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within SessionProvider');
  return value;
}

/** UI convenience — server still enforces authorization. */
export function useHasRole(...roles: Role[]): boolean {
  const { user } = useSession();
  return !!user && roles.includes(user.role);
}
