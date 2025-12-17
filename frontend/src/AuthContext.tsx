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
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role') as User['role'];
        const username = localStorage.getItem('username');
        const idStr = localStorage.getItem('id');

        const id = Number(idStr);
        
        if (token && role && username && Number.isFinite(id)) {
            setUser({ token, role, username, id });
        } else {
            localStorage.clear();
            setUser(null);
        }
    }, []);

    const login = (data: LoginResponse) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', data.username);
        localStorage.setItem('id', String(data.id)); // localStorage只能存字符串
        setUser({
            token: data.token,
            role: data.role,
            username: data.username,
            id: data.id
        });
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};