import React, { createContext, useCallback, useEffect, useState } from 'react';
import { getCurrentUser, logout as apiLogout, type AuthUser } from '../api/auth';
import { clearLoginSession, saveAuthSession } from '../utils/auth';

type AuthContextType = {
    user: AuthUser | null;
    loading: boolean;
    login: (token: string, userData: AuthUser) => void;
    logout: () => void;
};

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const checkLogin = useCallback(async () => {
        const token = localStorage.getItem('report_system_token') || localStorage.getItem('accessToken');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const current = await getCurrentUser();
            setUser(current);
            saveAuthSession(token, current.role, current.username);
        } catch {
            clearLoginSession();
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkLogin();
    }, [checkLogin]);

    const loginHandler = (token: string, userData: AuthUser) => {
        saveAuthSession(token, userData.role, userData.username);
        setUser(userData);
    };

    const logoutHandler = () => {
        apiLogout().finally(() => {
            clearLoginSession();
            setUser(null);
            window.location.href = '/';
        });
    };

    return (
        <AuthContext.Provider value={{ user, loading, login: loginHandler, logout: logoutHandler }}>
            {children}
        </AuthContext.Provider>
    );
}
