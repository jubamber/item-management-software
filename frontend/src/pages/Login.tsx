// src/pages/Login.tsx
// 登录页面

import React, { useState, useContext, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { type LoginResponse } from '../types';

const Login: React.FC = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            // 泛型指定返回类型
            const res = await api.post<LoginResponse>('/login', formData);
            login(res.data);
            // 根据角色跳转
            if (res.data.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            alert(err.response?.data?.msg || 'Login failed');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="page-container-narrow">
            <h3>用户登录</h3>
            <div className="form-group">
                <label>用户名/邮箱:</label>
                <input 
                    type="text" 
                    className="form-control"
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                />
            </div>
            <div className="form-group">
                <label>密码:</label>
                <input 
                    type="password" 
                    className="form-control"
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                />
            </div>
            <button type="submit" style={{ marginTop: '10px' }}>登录</button>
        </form>
    );
};

export default Login;