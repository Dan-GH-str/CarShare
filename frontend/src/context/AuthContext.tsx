import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStorage } from '../api/client';
import { User } from '../types/domain';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    lastName: string;
    firstName: string;
    middleName?: string;
    phone: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const userScopedQueryKeys = new Set(['profile', 'trips']);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenStorage.accessToken));

  const clearUserScopedQueries = useCallback(async () => {
    const filters = {
      predicate: (query: { queryKey: readonly unknown[] }) => userScopedQueryKeys.has(String(query.queryKey[0])),
    };

    await queryClient.cancelQueries(filters);
    queryClient.removeQueries(filters);
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const current = await api.auth.me();
    setUser(current);
  }, []);

  useEffect(() => {
    let alive = true;
    if (!tokenStorage.accessToken) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then((current) => {
        if (alive) setUser(current);
      })
      .catch(() => {
        tokenStorage.clear();
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const result = await api.auth.login({ email, password });
        await clearUserScopedQueries();
        tokenStorage.set(result.accessToken, result.refreshToken);
        setUser(result.user);
      },
      async register(data) {
        const result = await api.auth.register(data);
        await clearUserScopedQueries();
        tokenStorage.set(result.accessToken, result.refreshToken);
        setUser(result.user);
      },
      async logout() {
        await api.auth.logout().catch(() => undefined);
        await clearUserScopedQueries();
        tokenStorage.clear();
        setUser(null);
      },
      refreshUser,
    }),
    [clearUserScopedQueries, loading, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
