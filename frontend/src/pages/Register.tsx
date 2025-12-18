// src/pages/Register.tsx
// 注册页面

import React, { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        phone: '',
        address: ''
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/register', formData);
            alert('注册成功，请等待管理员审核');
            navigate('/login');
        } catch (err: any) {
            alert(err.response?.data?.msg || 'Registration failed');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '50px auto' }}>
            <h3>新用户注册</h3>
            <div className="form-group">
                <label>用户名:</label>
                <input required name="username" type="text" onChange={handleChange} />
            </div>
            <div className="form-group">
                <label>邮箱:</label>
                <input required name="email" type="email" onChange={handleChange} />
            </div>
            <div className="form-group">
                <label>密码:</label>
                <input required name="password" type="password" onChange={handleChange} />
            </div>
            <div className="form-group">
                <label>手机号:</label>
                <input name="phone" type="text" onChange={handleChange} />
            </div>
            <div className="form-group">
                <label>住址:</label>
                <input name="address" type="text" onChange={handleChange} />
            </div>
            <button type="submit" style={{ marginTop: '20px' }}>提交注册</button>
        </form>
    );
};

export default Register;