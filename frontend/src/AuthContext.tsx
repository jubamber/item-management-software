// src/AuthContext.tsx
// 上下文管理

import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { type User, type LoginResponse } from './types';

interface AuthContextType {
    user: Partial<User> | null;
    login: (data: LoginResponse) => void;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {},
    logout: () => {}
});

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<Partial<User> | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role') as User['role'];
        const username = localStorage.getItem('username');
        
        if (token && role && username) {
            setUser({ token, role, username });
        }
    }, []);

    const login = (data: LoginResponse) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', data.username);
        // 这里简单存一些信息，实际项目中可以用 decode jwt 获取更多
        setUser({ 
            token: data.token, 
            role: data.role, 
            username: data.username 
        });
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};