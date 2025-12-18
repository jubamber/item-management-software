// src/api.ts
// API 配置

import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

// 扩展 AxiosRequestConfig 类型以支持 _retry 属性
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const api = axios.create({
    baseURL: 'http://localhost:5000',
});

// 请求拦截器：读取 sessionStorage
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // 从 sessionStorage 获取 token
    const token = sessionStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// 响应拦截器：处理 Token 过期及自动刷新
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        // 如果后端返回 401 Unauthorized，且该请求没有重试过
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            
            // 如果原来的请求就是去刷新 token 的 (url 为 /refresh)，说明 Refresh Token 也失效了
            // 这种情况下直接登出，防止死循环
            if (originalRequest.url === '/refresh') {
                sessionStorage.clear();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            originalRequest._retry = true; // 标记该请求已重试

            try {
                const refreshToken = sessionStorage.getItem('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // 调用刷新接口
                // 注意：这里使用 axios 原始实例而不是 api 实例，避免重复触发拦截器
                // 假设 refresh 接口需要将 refresh_token 放在 Authorization 头中
                const response = await axios.post('http://localhost:5000/refresh', {}, {
                    headers: {
                        Authorization: `Bearer ${refreshToken}`
                    }
                });

                const { token } = response.data;

                // 1. 更新本地存储中的 Access Token
                sessionStorage.setItem('token', token);

                // 2. 更新原请求的 Header
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                }

                // 3. 重发原请求
                return api(originalRequest);

            } catch (refreshError) {
                // 刷新失败（Refresh Token 过期或无效）
                console.error("Token refresh failed:", refreshError);
                
                // 清除本地存储
                sessionStorage.clear();
                
                // 强制跳转回登录页
                if (window.location.pathname !== '/login') {
                    alert('登录已过期，请重新登录');
                    window.location.href = '/login';
                }
                
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;