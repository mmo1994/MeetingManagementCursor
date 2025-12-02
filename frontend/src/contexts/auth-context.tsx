'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiRequestError } from '@/lib/api';
import type { User, ApiResponse, LoginFormData, RegisterFormData } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      if (!api.isAuthenticated()) {
        setUser(null);
        return;
      }

      const response = await api.get<ApiResponse<User>>('/auth/me');
      setUser(response.data);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        api.clearTokens();
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      api.loadTokens();
      if (api.isAuthenticated()) {
        await refreshUser();
      }
      setIsLoading(false);
    };

    initAuth();

    api.setAuthChangeCallback((isAuthenticated) => {
      if (!isAuthenticated) {
        setUser(null);
        router.push('/login');
      }
    });
  }, [refreshUser, router]);

  const login = async (data: LoginFormData) => {
    const response = await api.post<ApiResponse<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>>('/auth/login', data);

    api.setTokens(response.data.accessToken, response.data.refreshToken);
    setUser(response.data.user);
    router.push('/dashboard');
  };

  const register = async (data: RegisterFormData) => {
    const response = await api.post<ApiResponse<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>>('/auth/register', data);

    api.setTokens(response.data.accessToken, response.data.refreshToken);
    setUser(response.data.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    } finally {
      api.clearTokens();
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

