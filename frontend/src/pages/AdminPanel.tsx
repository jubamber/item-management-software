// src/pages/AdminPanel.tsx

import React, { useEffect, useState } from 'react';
import api from '../api';
// 注意：你需要确保 User 类型定义里包含了 phone 和 address，如果之前没定义，可以在 types.ts 里补上，
// 或者直接在这里扩展接口，如下所示：
import { type User as BaseUser, type AttributeDefinition } from '../types';
import Loading from '../components/Loading';

interface User extends BaseUser {
    phone?: string;
    address?: string;
}

interface NewTypeState {
    name: string;
    attributes: AttributeDefinition[];
}

const AdminPanel: React.FC = () => {
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [approvedUsers, setApprovedUsers] = useState<User[]>([]); // 已审核用户列表
    const [searchTerm, setSearchTerm] = useState(''); // 搜索关键词
    const [newType, setNewType] = useState<NewTypeState>({ name: '', attributes: [] });

    // 新增页面 loading 状态
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        // 加载 pending 和 approved 用户
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
                setPageLoading(false); // 所有数据异步加载完成后取消 loading
            }
        };
        fetchData();
    }, []); // 只在页面首次渲染加载

    // 获取已通过用户（支持搜索）
    const fetchApprovedUsers = async (keyword: string = '') => {
        try {
            // status=approved 且带上 keyword
            const url = `/admin/users?status=approved&keyword=${keyword}`;
            const res = await api.get<User[]>(url);
            setApprovedUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch approved users");
        }
    };

    const handleApproval = async (userId: number, action: 'approve' | 'reject') => {
        await api.post(`/admin/approve/${userId}`, { action });
        // 刷新数据
        const [pendingRes, approvedRes] = await Promise.all([
            api.get<User[]>('/admin/users?status=pending'),
            api.get<User[]>(`/admin/users?status=approved&keyword=${searchTerm}`)
        ]);
        setPendingUsers(pendingRes.data);
        setApprovedUsers(approvedRes.data);
    };

    // 处理搜索
    const handleSearch = () => {
        fetchApprovedUsers(searchTerm);
    };

    // 删除用户
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

    // 提升为管理员
    const handlePromote = async (userId: number, username: string) => {
        if (!window.confirm(`确定将用户 "${username}" 提升为管理员吗？`)) return;

        try {
            await api.post(`/admin/promote/${userId}`);
            alert(`${username} 已被提升为管理员`);
            fetchApprovedUsers(searchTerm); // 刷新列表
        } catch (e) {
            alert("操作失败");
        }
    };

    // 降为普通用户
    const handleDemote = async (userId: number, username: string) => {
        if (!window.confirm(`确定将用户 "${username}" 降为普通用户吗？`)) return;

        try {
            await api.post(`/admin/demote/${userId}`);
            alert(`${username} 已降为普通用户`);
            fetchApprovedUsers(searchTerm); // 刷新列表
        } catch (e) {
            alert("操作失败");
        }
    };

    // ---------- 如果页面正在加载，显示整页 Loading ----------
    if (pageLoading) return <Loading />;

    return (
        <div>
            <h2>管理员后台</h2>
            
            {/* 1. 待审核用户区域 */}
            <div style={{ marginBottom: '40px' }}>
                <h3>待审核用户</h3>
                {pendingUsers.length === 0 ? <p style={{color: '#888'}}>无待审核用户</p> : (
                    <table style={tableStyle}>
                        <thead style={theadStyle}>
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
                                    <td>{u.id}</td>
                                    <td>{u.username}</td>
                                    <td>{u.email}</td>
                                    <td>
                                        <button onClick={() => handleApproval(u.id, 'approve')} style={approveBtn}>通过</button>
                                        <button onClick={() => handleApproval(u.id, 'reject')} style={rejectBtn}>拒绝</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 2. 用户管理区域 (已通过用户) */}
            <div style={partition}>
                <h3>用户管理 (已通过)</h3>
                
                {/* 搜索栏 */}
                <div style={{ marginBottom: '15px' }}>
                    <input 
                        type="text" 
                        placeholder="搜索用户名、邮箱或电话..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '8px', width: '250px', marginRight: '10px' }}
                    />
                    <button onClick={handleSearch} style={{ padding: '8px 15px' }}>搜索</button>
                    <button onClick={() => { setSearchTerm(''); fetchApprovedUsers(''); }} style={{ marginLeft: '10px', padding: '8px 15px' }}>重置</button>
                </div>

                <table style={tableStyle}>
                    <thead style={theadStyle}>
                        <tr>
                            <th>ID</th>
                            <th>用户名</th>
                            <th>角色</th>
                            <th>邮箱</th>
                            <th>电话</th>
                            <th>地址</th>
                            <th>删除</th>
                            <th>权限管理</th>
                        </tr>
                    </thead>
                    <tbody>
                        {approvedUsers.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>未找到用户</td></tr>
                        ) : (
                            approvedUsers.map(u => (
                                <tr key={u.id}>
                                    <td>{u.id}</td>
                                    <td><strong>{u.username}</strong></td>
                                    <td>
                                        <span style={{ 
                                            background: u.role === 'admin' ? '#ffd43b' : '#e7f5ff',
                                            padding: '2px 6px', borderRadius: '4px', fontSize: '12px'
                                        }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td>{u.email}</td>
                                    <td>{u.phone || '-'}</td>
                                    <td>{u.address || '-'}</td>
                                    <td>
                                        {/* 删除按钮仅针对非admin */}
                                        {u.username !== 'admin' && (
                                            <button 
                                                onClick={() => handleDeleteUser(u.id, u.username)}
                                                style={deleteBtn}
                                            >
                                                删除
                                            </button>
                                        )}
                                        {u.username === 'admin' && (
                                            <div>-</div>
                                        )}
                                    </td>
                                    <td>
                                        {u.role === 'user' && (
                                            <button 
                                                onClick={() => handlePromote(u.id, u.username)}
                                                style={promoteBtn}
                                            >
                                                提升为管理员
                                            </button>
                                        )}
                                        {u.role === 'admin' && u.username !== 'admin' && (
                                            <button 
                                                onClick={() => handleDemote(u.id, u.username)}
                                                style={demoteBtn}
                                            >
                                                降为普通用户
                                            </button>
                                        )}
                                        {u.username === 'admin' && (
                                            <div>-</div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 3. 物品类型管理区域 */}
            <div style={partition}>
                <h3>添加物品类型</h3>
                <input 
                    placeholder="类型名称 (如: 电子产品)" 
                    value={newType.name}
                    onChange={e => setNewType({ ...newType, name: e.target.value })}
                    style={{ padding: '8px', marginRight: '10px' }}
                />
                <button onClick={handleAddType} style={{ padding: '8px 15px' }}>添加类型</button>
                <p style={{ fontSize: '12px', color: 'gray', marginTop: '5px' }}>
                    *注意：当前为演示模式，新类型将自动包含"品牌"和"新旧程度"两个属性。
                </p>
            </div>
            {/* <div style={partition}>
                <h3>添加物品类型</h3>
                {username !== 'admin' && (
                    <button 
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        style={deleteBtn}
                    >
                        删除
                    </button>
                )}
            </div> */}
        </div>
    );
};

// ---------- 公共样式 ----------
const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    marginBottom: '20px',
    textAlign: 'center'  // <- 加上这一行
};

const theadStyle: React.CSSProperties = {
    background: '#f8f9fa'
};

const approveBtn: React.CSSProperties = {
    marginRight: '10px',
    color: 'green'
};

const rejectBtn: React.CSSProperties = {
    color: 'red'
};

const deleteBtn: React.CSSProperties = {
    background: '#ff6b6b', color: 'white', border: 'none',
    padding: '5px 10px', borderRadius: '4px', cursor: 'pointer',
    marginRight: '5px'
};

const promoteBtn: React.CSSProperties = {
    background: '#1c7ed6', color: 'white', border: 'none',
    padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
};

const demoteBtn: React.CSSProperties = {
    background: '#85d61cff', color: 'white', border: 'none',
    padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
};

const partition: React.CSSProperties = {
    marginBottom: '40px', borderTop: '2px dashed #ccc', paddingTop: '20px'
};

export default AdminPanel;