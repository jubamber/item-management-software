// src/api.ts
// API 配置

import axios, { type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000',
});

// 请求拦截器
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;