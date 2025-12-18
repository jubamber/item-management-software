// src/pages/AdminPanel.tsx

import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../AuthContext';
// 确保引入 ItemType
import { type User as BaseUser, type AttributeDefinition, type ItemType } from '../types';
import Loading from '../components/Loading';
import './AdminPanel.css';

interface User extends BaseUser {
    phone?: string;
    address?: string;
}

interface NewTypeState {
    name: string;
    attributes: AttributeDefinition[];
}

// 简单的随机字符串生成函数
const generateRandomKey = () => {
    return 'attr_' + Math.random().toString(36).substr(2, 9);
};

const AdminPanel: React.FC = () => {
    const { user } = useContext(AuthContext);

    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // === 新增状态 (Create) ===
    const [newType, setNewType] = useState<NewTypeState>({ name: '', attributes: [] });
    const [optionsInput, setOptionsInput] = useState<Record<number, string>>({});
    
    // === 新增状态 (Edit/Manage) ===
    const [itemTypes, setItemTypes] = useState<ItemType[]>([]); // 所有可用类型列表
    const [editingTypeId, setEditingTypeId] = useState<number | string>(''); // 当前选中的类型ID
    const [editingTypeState, setEditingTypeState] = useState<NewTypeState>({ name: '', attributes: [] }); // 编辑中的数据
    const [editingOptionsInput, setEditingOptionsInput] = useState<Record<number, string>>({}); // 编辑中的选项字符串缓存

    const [pageLoading, setPageLoading] = useState(true);

    // 初始化加载
    useEffect(() => {
        const fetchData = async () => {
            setPageLoading(true);
            try {
                const [pendingRes, approvedRes, typesRes] = await Promise.all([
                    api.get<User[]>('/admin/users?status=pending'),
                    api.get<User[]>(`/admin/users?status=approved&keyword=${searchTerm}`),
                    api.get<ItemType[]>('/types') // 获取现有类型
                ]);
                setPendingUsers(pendingRes.data);
                setApprovedUsers(approvedRes.data);
                setItemTypes(typesRes.data);
            } catch (err) {
                console.error("Failed to fetch data", err);
            } finally {
                setPageLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchApprovedUsers = async (keyword: string = '') => {
        // ... (保持原有逻辑不变)
        try {
            const url = `/admin/users?status=approved&keyword=${keyword}`;
            const res = await api.get<User[]>(url);
            setApprovedUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch approved users");
        }
    };
    
    // 刷新类型列表的辅助函数
    const fetchItemTypes = async () => {
        try {
            const res = await api.get<ItemType[]>('/types');
            setItemTypes(res.data);
        } catch (e) {
            console.error("Failed to fetch types");
        }
    };

    // ... (保持原有 User 管理逻辑不变: handleApproval, handleSearch, handleDeleteUser, handlePromote, handleDemote) ...
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
    
    const handlePromote = async (userId: number, username: string) => {
         // ... (保持原有逻辑)
         if (!window.confirm(`确定将用户 "${username}" 提升为管理员吗？`)) return;
         try {
             await api.post(`/admin/promote/${userId}`);
             alert(`${username} 已被提升为管理员`);
             fetchApprovedUsers(searchTerm);
         } catch (e) { alert("操作失败"); }
    };
 
    const handleDemote = async (userId: number, username: string) => {
         // ... (保持原有逻辑)
         if (!window.confirm(`确定将用户 "${username}" 降为普通用户吗？`)) return;
         try {
             await api.post(`/admin/demote/${userId}`);
             alert(`${username} 已降为普通用户`);
             fetchApprovedUsers(searchTerm);
         } catch (e) { alert("操作失败"); }
    };

    // ================= 原有：新增类型逻辑 (Create Logic) =================
    // ... (保持 addAttributeRow, removeAttributeRow, updateAttribute, handleOptionsChange, handleAddType 不变)
    const addAttributeRow = () => {
        setNewType(prev => ({
            ...prev,
            attributes: [
                ...prev.attributes, 
                // key 初始化为随机字符串
                { key: generateRandomKey(), label: '', type: 'text', required: false }
            ]
        }));
    };
    const removeAttributeRow = (index: number) => {
        setNewType(prev => ({ ...prev, attributes: prev.attributes.filter((_, i) => i !== index) }));
        const newOptions = { ...optionsInput }; delete newOptions[index]; setOptionsInput(newOptions);
    };
    const updateAttribute = (index: number, field: keyof AttributeDefinition, value: any) => {
        const updatedAttrs = [...newType.attributes];
        updatedAttrs[index] = { ...updatedAttrs[index], [field]: value };
        setNewType(prev => ({ ...prev, attributes: updatedAttrs }));
    };
    const handleOptionsChange = (index: number, value: string) => {
        setOptionsInput(prev => ({ ...prev, [index]: value }));
        const optsArray = value.split(/[,，]/).map(s => s.trim()).filter(s => s !== '');
        const updatedAttrs = [...newType.attributes];
        updatedAttrs[index].options = optsArray;
        setNewType(prev => ({ ...prev, attributes: updatedAttrs }));
    };
    const handleAddType = async () => {
        if (!newType.name) return alert("请输入类型名称");
        // ... (原有校验逻辑)
        try {
            await api.post('/types', { name: newType.name, attributes: newType.attributes });
            alert("类型添加成功！");
            setNewType({ name: '', attributes: [] });
            setOptionsInput({});
            fetchItemTypes(); // 添加成功后刷新列表
        } catch (e: any) {
            alert("添加失败: " + (e.response?.data?.msg || e.message));
        }
    };

    // ================= 新增：编辑类型逻辑 (Manage/Edit Logic) =================
    
    // 1. 选择要编辑的类型
    const handleSelectEditType = (typeIdStr: string) => {
        const typeId = parseInt(typeIdStr);
        setEditingTypeId(typeIdStr);
        
        if (!typeIdStr) {
            setEditingTypeState({ name: '', attributes: [] });
            setEditingOptionsInput({});
            return;
        }

        const targetType = itemTypes.find(t => t.id === typeId);
        if (targetType) {
            // 深拷贝 attributes 以防直接修改原引用
            const attrsClone = targetType.attributes.map(attr => ({...attr}));
            setEditingTypeState({
                name: targetType.name,
                attributes: attrsClone
            });

            // 初始化选项字符串显示
            const optsMap: Record<number, string> = {};
            attrsClone.forEach((attr, idx) => {
                if (attr.type === 'select' && attr.options) {
                    optsMap[idx] = attr.options.join(', ');
                }
            });
            setEditingOptionsInput(optsMap);
        }
    };

    // 2. 编辑模式下的属性操作 (为了不破坏原有逻辑，这里复制了一份针对 editingTypeState 的操作)
    const addAttrRowEdit = () => {
        setEditingTypeState(prev => ({
            ...prev,
            attributes: [
                ...prev.attributes, 
                { key: generateRandomKey(), label: '', type: 'text', required: false }
            ]
        }));
    };

    const removeAttrRowEdit = (index: number) => {
        setEditingTypeState(prev => ({ ...prev, attributes: prev.attributes.filter((_, i) => i !== index) }));
        const newOptions = { ...editingOptionsInput }; delete newOptions[index]; setEditingOptionsInput(newOptions);
    };

    const updateAttrEdit = (index: number, field: keyof AttributeDefinition, value: any) => {
        const updatedAttrs = [...editingTypeState.attributes];
        updatedAttrs[index] = { ...updatedAttrs[index], [field]: value };
        setEditingTypeState(prev => ({ ...prev, attributes: updatedAttrs }));
    };

    const handleOptionsChangeEdit = (index: number, value: string) => {
        setEditingOptionsInput(prev => ({ ...prev, [index]: value }));
        const optsArray = value.split(/[,，]/).map(s => s.trim()).filter(s => s !== '');
        const updatedAttrs = [...editingTypeState.attributes];
        updatedAttrs[index].options = optsArray;
        setEditingTypeState(prev => ({ ...prev, attributes: updatedAttrs }));
    };

    // 3. 保存更新
    const handleUpdateType = async () => {
        if (!editingTypeId) return;
        if (!editingTypeState.name) return alert("类型名称不能为空");

        // 简单校验
        for (let attr of editingTypeState.attributes) {
            if (!attr.label || !attr.key) return alert("所有属性必须包含 Label 和 Key");
            if (attr.type === 'select' && (!attr.options || attr.options.length === 0)) return alert(`属性 "${attr.label}" 需要至少一个选项`);
        }

        try {
            await api.put(`/types/${editingTypeId}`, editingTypeState);
            alert("类型更新成功");
            setEditingTypeId('');
            setEditingTypeState({ name: '', attributes: [] });
            setEditingOptionsInput({});

            // 刷新类型列表
            fetchItemTypes();
        } catch (e: any) {
            alert("更新失败: " + (e.response?.data?.msg || e.message));
        }
    };

    // 4. 删除类型
    const handleDeleteType = async () => {
        if (!editingTypeId) return;
        if (!window.confirm("确定删除该类型吗？这将可能影响属于该类型的所有物品！")) return;

        try {
            await api.delete(`/types/${editingTypeId}`);
            alert("类型已删除");
            setEditingTypeId('');
            setEditingTypeState({ name: '', attributes: [] });
            fetchItemTypes();
        } catch (e: any) {
            alert("删除失败: " + (e.response?.data?.msg || e.message));
        }
    };


    if (pageLoading) return <Loading />;

    return (
        <div className="page-container">
            <h2>管理员后台</h2>
            
            {/* ... (省略 待审核用户 模块，保持不变) ... */}
            <div className="admin-section">
                <h3>待审核用户</h3>
                {pendingUsers.length === 0 ? <p className="empty-text">当前无待审核用户</p> : (
                   <table className="admin-table">
                       <thead>
                           <tr><th>ID</th><th>用户名</th><th>邮箱</th><th>电话</th><th>地址</th><th>操作</th></tr>
                       </thead>
                       <tbody>
                           {pendingUsers.map(u => (
                               <tr key={u.id}>
                                   <td>#{u.id}</td><td>{u.username}</td><td>{u.email}</td>
                                   <td>{u.phone || '-'}</td><td>{u.address || '-'}</td>
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

            {/* ... (省略 用户管理 模块，保持不变) ... */}
            <div className="partition">
                <h3>用户管理 (已通过)</h3>
                 {/* Filter Bar */}
                 <div className="filter-bar">
                    <input type="text" placeholder="搜索用户名、邮箱或电话..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="control-input flex-grow" />
                    <button onClick={handleSearch} className="btn-action btn-primary">搜索</button>
                    <button onClick={() => { setSearchTerm(''); fetchApprovedUsers(''); }} className="btn-action btn-secondary">重置</button>
                </div>
                <table className="admin-table">
                    <thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>邮箱</th><th>电话</th><th>地址</th><th>删除</th><th>权限</th></tr></thead>
                    <tbody>
                        {approvedUsers.map(u => (
                            <tr key={u.id}>
                                <td>#{u.id}</td><td><strong>{u.username}</strong></td>
                                <td><span className={`role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>{u.role === 'admin' ? '管理员' : '用户'}</span></td>
                                <td>{u.email}</td><td>{u.phone || '-'}</td><td>{u.address || '-'}</td>
                                <td>{u.username !== 'admin' && u.username !== user?.username ? (<button onClick={() => handleDeleteUser(u.id, u.username)} className="btn-sm btn-delete">删除</button>) : '-'}</td>
                                <td>
                                    {u.role === 'user' && (<button onClick={() => handlePromote(u.id, u.username)} className="btn-sm btn-promote">提权</button>)}
                                    {u.role === 'admin' && u.username !== 'admin' && u.username !== user?.username && (<button onClick={() => handleDemote(u.id, u.username)} className="btn-sm btn-demote">降权</button>)}
                                    {(u.username === 'admin' || u.username === user?.username) && <div>-</div>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 3. 添加物品类型 (Create) - 保持不变 */}
            <div className="partition">
                <h3>添加物品类型 (Create New Type)</h3>
                
                <div style={{ marginBottom: '15px' }}>
                    <label className="input-label">类型名称:</label>
                    <input 
                        placeholder="例如: 电子产品" 
                        value={newType.name}
                        onChange={e => setNewType({ ...newType, name: e.target.value })}
                        className="control-input"
                        style={{ width: '100%', maxWidth: '400px' }}
                    />
                </div>

                <div className="attributes-editor">
                    <h4>属性定义</h4>
                    {newType.attributes.map((attr, index) => (
                        <div key={index} className="attribute-row">
                            <div className="attr-inputs">
                                <input placeholder="名称 (如: 颜色)" value={attr.label} onChange={e => updateAttribute(index, 'label', e.target.value)} className="control-input attr-field" />
                                <input 
                                    placeholder="Key" 
                                    value={attr.key} 
                                    onChange={e => updateAttribute(index, 'key', e.target.value)} // 如果想完全禁止修改，可以去掉 onChange 或改为 readOnly
                                    className="control-input attr-field" 
                                    style={{ backgroundColor: '#f5f5f5', color: '#666' }} // 视觉上置灰
                                    title="自动生成的唯一标识"
                                />
                                <select value={attr.type} onChange={e => updateAttribute(index, 'type', e.target.value)} className="control-input attr-field">
                                    <option value="text">文本</option><option value="number">数字</option><option value="date">日期</option><option value="select">下拉选项</option>
                                </select>
                                <label className="checkbox-label"><input type="checkbox" checked={attr.required || false} onChange={e => updateAttribute(index, 'required', e.target.checked)} /> 必填</label>
                                <button onClick={() => removeAttributeRow(index)} className="btn-sm btn-delete">×</button>
                            </div>
                            {attr.type === 'select' && (
                                <div className="options-row">
                                    <input placeholder="选项，逗号分隔" value={optionsInput[index] || ''} onChange={e => handleOptionsChange(index, e.target.value)} className="control-input full-width" />
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="action-row" style={{ marginTop: '10px' }}>
                        <button onClick={addAttributeRow} className="btn-action btn-secondary">+ 添加属性</button>
                        <button onClick={handleAddType} className="btn-action btn-primary" style={{ marginLeft: '10px' }}>保存新类型</button>
                    </div>
                </div>
            </div>

            {/* ================= 4. 新增：管理已有物品类型 (Manage Existing Types) ================= */}
            <div className="partition" style={{ marginTop: '30px', borderTop: '2px dashed #eee', paddingTop: '20px' }}>
                <h3>管理已有物品类型 (Manage Existing Types)</h3>
                
                <div style={{ marginBottom: '20px' }}>
                    <label className="input-label">选择要编辑的类型:</label>
                    <select 
                        className="control-input" 
                        style={{ width: '100%', maxWidth: '400px' }}
                        value={editingTypeId}
                        onChange={(e) => handleSelectEditType(e.target.value)}
                    >
                        <option value="">-- 请选择 --</option>
                        {itemTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.name} (ID: {t.id})</option>
                        ))}
                    </select>
                </div>

                {/* 仅当选择了类型时显示编辑器 */}
                {editingTypeId && (
                    <div className="attributes-editor edit-mode-box">
                        <div style={{ marginBottom: '15px' }}>
                            <label className="input-label">修改名称:</label>
                            <input 
                                value={editingTypeState.name}
                                onChange={e => setEditingTypeState({ ...editingTypeState, name: e.target.value })}
                                className="control-input"
                                style={{ width: '100%', maxWidth: '400px' }}
                            />
                        </div>

                        <h4>属性配置</h4>
                        {editingTypeState.attributes.map((attr, index) => (
                            <div key={index} className="attribute-row">
                                <div className="attr-inputs">
                                    <input 
                                        placeholder="名称 (如: 颜色)"
                                        value={attr.label}
                                        onChange={e => updateAttrEdit(index, 'label', e.target.value)}
                                        className="control-input attr-field"
                                    />
                                    <input 
                                        placeholder="Key" 
                                        value={attr.key} 
                                        onChange={e => updateAttribute(index, 'key', e.target.value)} // 如果想完全禁止修改，可以去掉 onChange 或改为 readOnly
                                        className="control-input attr-field" 
                                        style={{ backgroundColor: '#f5f5f5', color: '#666' }} // 视觉上置灰
                                        title="自动生成的唯一标识"
                                    />
                                    <select 
                                        value={attr.type}
                                        onChange={e => updateAttrEdit(index, 'type', e.target.value)}
                                        className="control-input attr-field"
                                    >
                                        <option value="text">文本</option>
                                        <option value="number">数字</option>
                                        <option value="date">日期</option>
                                        <option value="select">下拉选项</option>
                                    </select>
                                    <label className="checkbox-label">
                                        <input 
                                            type="checkbox"
                                            checked={attr.required || false}
                                            onChange={e => updateAttrEdit(index, 'required', e.target.checked)}
                                        /> 必填
                                    </label>
                                    <button onClick={() => removeAttrRowEdit(index)} className="btn-sm btn-delete">×</button>
                                </div>

                                {attr.type === 'select' && (
                                    <div className="options-row">
                                        <input 
                                            placeholder="选项，逗号分隔 (例如: A, B, C)"
                                            value={editingOptionsInput[index] || ''}
                                            onChange={e => handleOptionsChangeEdit(index, e.target.value)}
                                            className="control-input full-width"
                                        />
                                        <small className="hint-text">当前解析: {attr.options?.join(' / ')}</small>
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="action-row" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                            <button onClick={addAttrRowEdit} className="btn-action btn-secondary">+ 增加属性</button>
                            <button onClick={handleUpdateType} className="btn-action btn-primary">保存修改</button>
                            <div style={{ flexGrow: 1 }}></div>
                            <button onClick={handleDeleteType} className="btn-action btn-delete" style={{ backgroundColor: '#e74c3c', color: 'white' }}>删除该类型</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;