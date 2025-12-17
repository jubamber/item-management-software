// src/App.tsx
// 主程序入口

import React, { useContext, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddItem from './pages/AddItem';
import AdminPanel from './pages/AdminPanel';
import Loading from './components/Loading';
import './App.css'; 

const Navbar: React.FC = () => {
    const { user, logout } = useContext(AuthContext);
    return (
        <nav className="navbar">
            <Link to="/" className="navbar-logo">物品复活系统</Link>
            <Link to="/" className="navbar-link">浏览物品</Link>

            {user ? (
                <>
                    <Link to="/add-item" className="navbar-link">发布物品</Link>
                    {user.role === 'admin' && <Link to="/admin" className="navbar-link">管理员后台</Link>}
                    <div className="navbar-user">
                        欢迎, <strong>{user.username}</strong>
                        <button onClick={logout} className="navbar-btn">退出</button>
                    </div>
                </>
            ) : (
                <div className="navbar-auth">
                    <Link to="/login" className="navbar-link">登录</Link>
                    <Link to="/register" className="navbar-link">注册</Link>
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 模拟页面加载，实际可以改成 fetch 数据或 token 验证
        const timer = setTimeout(() => setLoading(false), 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <AuthProvider>
            {loading ? (
                <Loading />
            ) : (
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
            )}
        </AuthProvider>
    );
}

export default App;