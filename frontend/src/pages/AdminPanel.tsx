// src/pages/AdminPanel.tsx

import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { type User as BaseUser, type AttributeDefinition } from '../types';
import Loading from '../components/Loading';
import './AdminPanel.css'; // <--- 引入刚才创建的 CSS 文件

interface User extends BaseUser {
    phone?: string;
    address?: string;
}

interface NewTypeState {
    name: string;
    attributes: AttributeDefinition[];
}

const AdminPanel: React.FC = () => {
    const { user } = useContext(AuthContext);

    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [newType, setNewType] = useState<NewTypeState>({ name: '', attributes: [] });
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setPageLoading(true);
            try {
                const [pendingRes, approvedRes] = await Promise.all([
                    api.get<User[]>('/admin/users?status=pending'),
                    api.get<User[]>(`/admin/users?status=approved&keyword=${searchTerm}`)
                ]);
                setPendingUsers(pendingRes.data);
                setApprovedUsers(approvedRes.data);
            } catch (err) {
                console.error("Failed to fetch users", err);
            } finally {
                setPageLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchApprovedUsers = async (keyword: string = '') => {
        try {
            const url = `/admin/users?status=approved&keyword=${keyword}`;
            const res = await api.get<User[]>(url);
            setApprovedUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch approved users");
        }
    };

    const handleApproval = async (userId: number, action: 'approve' | 'reject') => {
        await api.post(`/admin/approve/${userId}`, { action });
        const [pendingRes, approvedRes] = await Promise.all([
            api.get<User[]>('/admin/users?status=pending'),
            api.get<User[]>(`/admin/users?status=approved&keyword=${searchTerm}`)
        ]);
        setPendingUsers(pendingRes.data);
        setApprovedUsers(approvedRes.data);
    };

    const handleSearch = () => {
        fetchApprovedUsers(searchTerm);
    };

    const handleDeleteUser = async (userId: number, username: string) => {
        if (!window.confirm(`确定要永久删除用户 "${username}" 及其所有物品吗？`)) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            alert("用户已删除");
            fetchApprovedUsers(searchTerm);
            const pendingRes = await api.get<User[]>('/admin/users?status=pending');
            setPendingUsers(pendingRes.data);
        } catch (e) {
            alert("删除失败");
        }
    };

    const handleAddType = async () => {
        if (!newType.name) return alert("请输入类型名称");

        const demoAttributes: AttributeDefinition[] = [
            { key: "brand", label: "品牌", type: "text" },
            { key: "condition", label: "新旧程度", type: "text" }
        ];

        try {
            await api.post('/types', {
                name: newType.name,
                attributes: demoAttributes
            });
            alert("类型已添加 (带默认测试属性)");
            setNewType({ name: '', attributes: [] });
        } catch (e) {
            alert("添加失败");
        }
    };

    const handlePromote = async (userId: number, username: string) => {
        if (!window.confirm(`确定将用户 "${username}" 提升为管理员吗？`)) return;
        try {
            await api.post(`/admin/promote/${userId}`);
            alert(`${username} 已被提升为管理员`);
            fetchApprovedUsers(searchTerm);
        } catch (e) {
            alert("操作失败");
        }
    };

    const handleDemote = async (userId: number, username: string) => {
        if (!window.confirm(`确定将用户 "${username}" 降为普通用户吗？`)) return;
        try {
            await api.post(`/admin/demote/${userId}`);
            alert(`${username} 已降为普通用户`);
            fetchApprovedUsers(searchTerm);
        } catch (e) {
            alert("操作失败");
        }
    };

    if (pageLoading) return <Loading />;

    return (
        <div className="admin-container">
            <h2>管理员后台</h2>
            
            {/* 1. 待审核区域 */}
            <div className="admin-section">
                <h3>待审核用户</h3>
                {pendingUsers.length === 0 ? <p className="empty-text">当前无待审核用户</p> : (
                    <table className="admin-table">
                        {/* 必须添加 thead 以适配圆角和样式 */}
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>用户名</th>
                                <th>邮箱</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingUsers.map(u => (
                                <tr key={u.id}>
                                    <td>#{u.id}</td>
                                    <td>{u.username}</td>
                                    <td>{u.email}</td>
                                    <td>
                                        <button onClick={() => handleApproval(u.id, 'approve')} className="btn-text approve">通过</button>
                                        <button onClick={() => handleApproval(u.id, 'reject')} className="btn-text reject">拒绝</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 2. 用户管理区域 */}
            <div className="partition">
                <h3>用户管理 (已通过)</h3>
                
                {/* 过滤栏 */}
                <div className="filter-bar">
                    <input 
                        type="text" 
                        placeholder="搜索用户名、邮箱或电话..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="control-input flex-grow" 
                    />
                    <button onClick={handleSearch} className="btn-action btn-primary">搜索</button>
                    <button onClick={() => { setSearchTerm(''); fetchApprovedUsers(''); }} className="btn-action btn-secondary">重置</button>
                </div>

                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>用户名</th>
                            <th>角色</th>
                            <th>邮箱</th>
                            <th>电话</th>
                            <th>地址</th>
                            <th>删除用户</th>
                            <th>权限管理</th>
                        </tr>
                    </thead>
                    <tbody>
                        {approvedUsers.map(u => (
                            <tr key={u.id}>
                                <td>#{u.id}</td>
                                <td><strong>{u.username}</strong></td>
                                <td>
                                    <span className={`role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>
                                        {u.role === 'admin' ? '管理员' : '用户'}
                                    </span>
                                </td>
                                <td>{u.email}</td>
                                <td>{u.phone || '-'}</td>
                                <td>{u.address || '-'}</td>
                                <td>
                                    {u.username !== 'admin' && u.username !== user?.username ? (
                                        <button onClick={() => handleDeleteUser(u.id, u.username)} className="btn-sm btn-delete">删除</button>
                                    ) : <span className="text-gray-300">-</span>}
                                </td>
                                <td>
                                    {u.role === 'user' && (
                                        <button onClick={() => handlePromote(u.id, u.username)} className="btn-sm btn-promote">提权</button>
                                    )}
                                    {u.role === 'admin' && u.username !== 'admin' && u.username !== user?.username && (
                                        <button onClick={() => handleDemote(u.id, u.username)} className="btn-sm btn-demote">降权</button>
                                    )}
                                    {(u.username === 'admin' || u.username === user?.username) && <span className="text-gray-300">-</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 3. 添加物品类型 */}
            <div className="partition">
                <h3>添加物品类型</h3>
                <div className="filter-bar">
                    <input 
                        placeholder="类型名称 (如: 电子产品)" 
                        value={newType.name}
                        onChange={e => setNewType({ ...newType, name: e.target.value })}
                        className="control-input flex-grow"
                    />
                    <button onClick={handleAddType} className="btn-action btn-primary push-right">添加类型</button>
                </div>
                <p className="hint-text">*注意：当前为演示模式，新类型将自动包含"品牌"和"新旧程度"两个属性。</p>
            </div>
        </div>
    );
};

export default AdminPanel;