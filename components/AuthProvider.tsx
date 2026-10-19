'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { callApi, setUnauthorizedHandler } from '@/lib/api';
import { Session } from '@/lib/types';

const KEY = 'perpus_session_v1';

interface AuthCtx {
  session: Session | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>({ session: null, ready: false, login: async () => {}, logout: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch { /* abaikan data sesi yang rusak */ }
    setReady(true);
  }, []);

  const clear = useCallback(() => {
    try { window.localStorage.removeItem(KEY); } catch { /* abaikan */ }
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clear);
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const login = useCallback(async (username: string, password: string) => {
    const s = await callApi<Session>('login', { username, password });
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* abaikan */ }
    setSession(s);
  }, []);

  const logout = useCallback(async () => {
    const token = session?.token;
    clear();
    if (token) { try { await callApi('logout', {}, token); } catch { /* sesi sudah dibersihkan di sisi klien */ } }
  }, [session, clear]);

  return <Ctx.Provider value={{ session, ready, login, logout }}>{children}</Ctx.Provider>;
}
