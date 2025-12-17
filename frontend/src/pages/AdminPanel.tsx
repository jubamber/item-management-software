// src/pages/AdminPanel.tsx
// 管理员后台

import React, { useEffect, useState } from 'react';
import api from '../api';
import { type User, type AttributeDefinition } from '../types';

interface NewTypeState {
    name: string;
    attributes: AttributeDefinition[];
}

const AdminPanel: React.FC = () => {
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [newType, setNewType] = useState<NewTypeState>({ name: '', attributes: [] });

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    // API 请求不能缺少 JWT token
    const fetchPendingUsers = async () => {
        const res = await api.get<User[]>('/admin/users?status=pending');
        setPendingUsers(res.data);
    };

    const handleApproval = async (userId: number, action: 'approve' | 'reject') => {
        await api.post(`/admin/approve/${userId}`, { action });
        fetchPendingUsers();
    };

    const handleAddType = async () => {
        if (!newType.name) return alert("请输入类型名称");

        // 这里模拟一个固定的属性结构用于演示
        // 实际开发中应该提供一个UI来添加多个属性
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

    return (
        <div>
            <h2>管理员后台</h2>
            
            <div style={{ marginBottom: '40px' }}>
                <h3>待审核用户</h3>
                {pendingUsers.length === 0 ? <p>无待审核用户</p> : (
                    <table border={1} cellPadding={10} style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                                    <td>{u.id}</td>
                                    <td>{u.username}</td>
                                    <td>{u.email}</td>
                                    <td>
                                        <button onClick={() => handleApproval(u.id, 'approve')}>通过</button>
                                        <button onClick={() => handleApproval(u.id, 'reject')} style={{ marginLeft: '10px' }}>拒绝</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ borderTop: '1px solid #ccc', paddingTop: '20px' }}>
                <h3>添加物品类型</h3>
                <input 
                    placeholder="类型名称 (如: 电子产品)" 
                    value={newType.name}
                    onChange={e => setNewType({ ...newType, name: e.target.value })}
                />
                <button onClick={handleAddType} style={{ marginLeft: '10px' }}>添加类型</button>
                <p style={{ fontSize: '12px', color: 'gray' }}>
                    *注意：当前为演示模式，新类型将自动包含"品牌"和"新旧程度"两个属性。
                </p>
            </div>
        </div>
    );
};

export default AdminPanel;