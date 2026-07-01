import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, logout as apiLogout } from '../api/auth';

interface User {
  userId: string;
  username: string;
  role: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkLogin = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await getCurrentUser();
      setUser(res.data);
    } catch {
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLogin();
  }, [checkLogin]);

  const loginHandler = (token: string, userData: User) => {
    localStorage.setItem('accessToken', token);
    setUser(userData);
  };

  const logoutHandler = () => {
    apiLogout().finally(() => {
      localStorage.removeItem('accessToken');
      setUser(null);
      window.location.href = '/';
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login: loginHandler, logout: logoutHandler }}>
      {children}
    </AuthContext.Provider>
  );
};