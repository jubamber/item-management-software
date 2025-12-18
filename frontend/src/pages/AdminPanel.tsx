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
    // 修改 newType 的初始状态
    const [newType, setNewType] = useState<NewTypeState>({ name: '', attributes: [] });

    // 用于临时存储下拉选项输入的字符串 (key: attributeIndex, value: optionsString)
    const [optionsInput, setOptionsInput] = useState<Record<number, string>>({});
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

    // ================= 新增：属性管理逻辑 =================

    // 1. 添加一个新空属性行
    const addAttributeRow = () => {
        setNewType(prev => ({
            ...prev,
            attributes: [
                ...prev.attributes,
                { key: '', label: '', type: 'text', required: false }
            ]
        }));
    };

    // 2. 删除属性行
    const removeAttributeRow = (index: number) => {
        setNewType(prev => ({
            ...prev,
            attributes: prev.attributes.filter((_, i) => i !== index)
        }));
        // 清理对应的 optionsInput
        const newOptions = { ...optionsInput };
        delete newOptions[index];
        setOptionsInput(newOptions);
    };

    // 3. 更新属性字段
    const updateAttribute = (index: number, field: keyof AttributeDefinition, value: any) => {
        const updatedAttrs = [...newType.attributes];
        updatedAttrs[index] = { ...updatedAttrs[index], [field]: value };

        // 如果修改的是 Label，自动生成 Key (如果 Key 还是空的或者看起来是自动生成的)
        if (field === 'label') {
            const autoKey = value.trim().toLowerCase().replace(/\s+/g, '_'); // "保质 期" -> "保质_期" (简单拼音或英文处理，实际建议手动输入英文key)
            // 这里为了演示简单，我们假设用户会手动输入 Label，我们仅在 Key 为空时自动填充一个建议值
            if (!updatedAttrs[index].key) {
                updatedAttrs[index].key = autoKey;
            }
        }

        setNewType(prev => ({ ...prev, attributes: updatedAttrs }));
    };

    // 4. 处理下拉选项输入 (将逗号分隔的字符串转为数组)
    const handleOptionsChange = (index: number, value: string) => {
        setOptionsInput(prev => ({ ...prev, [index]: value }));
        
        // 实时分割字符串存入 attributes
        const optsArray = value.split(/[,，]/).map(s => s.trim()).filter(s => s !== '');
        const updatedAttrs = [...newType.attributes];
        updatedAttrs[index].options = optsArray;
        setNewType(prev => ({ ...prev, attributes: updatedAttrs }));
    };

    // ================= 修改：提交逻辑 =================

    const handleAddType = async () => {
        if (!newType.name) return alert("请输入类型名称");
        if (newType.attributes.length === 0) {
            if(!window.confirm("确定不添加任何自定义属性吗？")) return;
        }

        // 简单的校验
        for (let attr of newType.attributes) {
            if (!attr.label || !attr.key) {
                return alert("所有属性必须包含 名称(Label) 和 键名(Key)");
            }
            if (attr.type === 'select' && (!attr.options || attr.options.length === 0)) {
                return alert(`属性 "${attr.label}" 是下拉选框，请至少提供一个选项`);
            }
        }

        try {
            await api.post('/types', {
                name: newType.name,
                attributes: newType.attributes
            });
            alert("类型添加成功！");
            setNewType({ name: '', attributes: [] });
            setOptionsInput({});
        } catch (e: any) {
            alert("添加失败: " + (e.response?.data?.msg || e.message));
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
                                <th>电话</th> 
                                <th>地址</th> 
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingUsers.map(u => (
                                <tr key={u.id}>
                                    <td>#{u.id}</td>
                                    <td>{u.username}</td>
                                    <td>{u.email}</td>
                                    <td>{u.phone || '-'}</td>
                                    <td>{u.address || '-'}</td>
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

            {/* 3. 添加物品类型 (重构版) */}
            <div className="partition">
                <h3>添加物品类型 (自定义属性)</h3>
                
                {/* 类型名称输入 */}
                <div style={{ marginBottom: '15px' }}>
                    <label className="input-label">类型名称:</label>
                    <input 
                        placeholder="例如: 电子产品, 易腐食品" 
                        value={newType.name}
                        onChange={e => setNewType({ ...newType, name: e.target.value })}
                        className="control-input"
                        style={{ width: '100%', maxWidth: '400px' }}
                    />
                </div>

                {/* 属性列表编辑器 */}
                <div className="attributes-editor">
                    <h4>属性定义</h4>
                    {newType.attributes.map((attr, index) => (
                        <div key={index} className="attribute-row">
                            <div className="attr-inputs">
                                {/* 属性名 (Label) */}
                                <input 
                                    placeholder="显示名称 (如: 颜色)"
                                    value={attr.label}
                                    onChange={e => updateAttribute(index, 'label', e.target.value)}
                                    className="control-input attr-field"
                                />
                                
                                {/* 数据库键名 (Key) */}
                                <input 
                                    placeholder="字段Key (如: color)"
                                    value={attr.key}
                                    onChange={e => updateAttribute(index, 'key', e.target.value)}
                                    className="control-input attr-field"
                                    title="英文键名，用于数据库存储"
                                />

                                {/* 字段类型 */}
                                <select 
                                    value={attr.type}
                                    onChange={e => updateAttribute(index, 'type', e.target.value)}
                                    className="control-input attr-field"
                                >
                                    <option value="text">文本 (Text)</option>
                                    <option value="number">数字 (Number)</option>
                                    <option value="date">日期 (Date)</option>
                                    <option value="select">下拉选项 (Select)</option>
                                </select>

                                {/* 必填开关 */}
                                <label className="checkbox-label">
                                    <input 
                                        type="checkbox"
                                        checked={attr.required || false}
                                        onChange={e => updateAttribute(index, 'required', e.target.checked)}
                                    /> 必填
                                </label>

                                <button onClick={() => removeAttributeRow(index)} className="btn-sm btn-delete">×</button>
                            </div>

                            {/* 如果是 Select 类型，显示选项输入框 */}
                            {attr.type === 'select' && (
                                <div className="options-row">
                                    <input 
                                        placeholder="输入选项，用逗号分隔 (例如: 红色, 蓝色, 绿色)"
                                        value={optionsInput[index] || ''}
                                        onChange={e => handleOptionsChange(index, e.target.value)}
                                        className="control-input full-width"
                                    />
                                    <small className="hint-text">当前解析: {attr.options?.join(' / ')}</small>
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="action-row" style={{ marginTop: '10px' }}>
                        <button onClick={addAttributeRow} className="btn-action btn-secondary">+ 添加属性</button>
                        <button onClick={handleAddType} className="btn-action btn-primary" style={{ marginLeft: '10px' }}>保存类型配置</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;