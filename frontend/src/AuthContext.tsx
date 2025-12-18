// src/AuthContext.tsx
// 上下文管理

import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { type User, type LoginResponse } from './types';

interface AuthContextType {
    user: Partial<User> | null;
    login: (data: LoginResponse) => void;
    logout: () => void;
    setUser: React.Dispatch<React.SetStateAction<Partial<User> | null>>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {},
    logout: () => {},
    setUser: () => {}
});

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<Partial<User> | null>(null);

    useEffect(() => {
        const token = sessionStorage.getItem('token');
        const role = sessionStorage.getItem('role') as User['role'];
        const username = sessionStorage.getItem('username');
        const idStr = sessionStorage.getItem('id');

        const id = Number(idStr);
        
        if (token && role && username && Number.isFinite(id)) {
            setUser({ token, role, username, id });
        } else {
            // 如果缺少信息，确保清理干净
            sessionStorage.clear();
            setUser(null);
        }
    }, []);

    const login = (data: LoginResponse) => {
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('role', data.role);
        sessionStorage.setItem('username', data.username);
        sessionStorage.setItem('id', String(data.id));

        setUser({
            token: data.token,
            role: data.role,
            username: data.username,
            id: data.id
        });
    };

    const logout = () => {
        sessionStorage.clear();
        setUser(null);
        // 推荐登出后重定向到首页或登录页
        window.location.href = '/'; 
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};