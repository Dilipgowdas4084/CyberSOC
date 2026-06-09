'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User { id: string; name: string; email: string; role: string; }
interface AuthCtx { user: User | null; token: string | null; login: (email: string, password: string) => Promise<void>; logout: () => void; loading: boolean; }

const AuthContext = createContext<AuthCtx>({ user: null, token: null, login: async () => {}, logout: () => {}, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem('cybersoc_token');
    const u = localStorage.getItem('cybersoc_user');
    if (t && u) {
      // Validate token is not expired by checking exp claim
      try {
        const payload = JSON.parse(atob(t.split('.')[1]));
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          setToken(t);
          setUser(JSON.parse(u));
        } else {
          // Token expired — clear it
          localStorage.removeItem('cybersoc_token');
          localStorage.removeItem('cybersoc_user');
        }
      } catch {
        localStorage.removeItem('cybersoc_token');
        localStorage.removeItem('cybersoc_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const data = await res.json();
    setToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem('cybersoc_token', data.accessToken);
    localStorage.setItem('cybersoc_user', JSON.stringify(data.user));
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    setToken(null); setUser(null);
    localStorage.removeItem('cybersoc_token');
    localStorage.removeItem('cybersoc_user');
    router.push('/login');
  }, [router]);

  return <AuthContext.Provider value={{ user, token, login, logout, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
