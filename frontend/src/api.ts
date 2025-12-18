// src/api.ts
// API 配置

import axios, { type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000',
});

// 请求拦截器：读取 sessionStorage
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // 改为从 sessionStorage 获取 token
    const token = sessionStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// 新增响应拦截器，处理 Token 过期/无效的情况
api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    // 如果后端返回 401 Unauthorized，说明 Token 无效或过期
    if (error.response && error.response.status === 401) {
        // 清除本地存储
        sessionStorage.clear();
        // 强制跳转回登录页
        // 注意：这里使用 window.location 而不是 react-router，是为了确保状态完全重置
        if (window.location.pathname !== '/login') {
            alert('登录已过期，请重新登录');
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});

export default api;