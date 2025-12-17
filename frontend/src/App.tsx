// src/App.tsx
// 主程序入口

import React, { useContext, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddItem from './pages/AddItem';
import AdminPanel from './pages/AdminPanel';
import './App.css'; // 假设你保留了 CSS 文件

const Navbar: React.FC = () => {
    const { user, logout } = useContext(AuthContext);
    return (
        <nav style={{ padding: '10px', background: '#f0f0f0', marginBottom: '20px' }}>
            <Link to="/" style={{ marginRight: '10px', fontWeight: 'bold' }}>物品复活系统</Link>
            <Link to="/" style={{ marginRight: '10px' }}>浏览物品</Link>
            
            {user ? (
                <>
                    <Link to="/add-item" style={{ marginRight: '10px' }}>发布物品</Link>
                    {user.role === 'admin' && <Link to="/admin" style={{ marginRight: '10px' }}>管理员后台</Link>}
                    <span style={{ marginLeft: 'auto', float: 'right' }}>
                        欢迎, <strong>{user.username}</strong> | 
                        <button onClick={logout} style={{ marginLeft: '5px' }}>退出</button>
                    </span>
                </>
            ) : (
                <div style={{ float: 'right' }}>
                    <Link to="/login" style={{ marginRight: '10px' }}>登录</Link>
                    <Link to="/register">注册</Link>
                </div>
            )}
        </nav>
    );
};

// 私有路由组件类型
interface PrivateRouteProps {
    children: ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
    const { user } = useContext(AuthContext);
    // 这里简单判断，实际可能需要等待 loading 状态
    return user ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Router>
                <Navbar />
                <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/add-item" element={
                            <PrivateRoute>
                                <AddItem />
                            </PrivateRoute>
                        } />
                        <Route path="/admin" element={
                            <PrivateRoute>
                                <AdminPanel />
                            </PrivateRoute>
                        } />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;