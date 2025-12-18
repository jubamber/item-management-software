// src/pages/Dashboard.tsx

import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { type Item, type ItemType } from '../types';
import './Dashboard.css'; // 仅保留网格布局样式

const Dashboard: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [items, setItems] = useState<Item[]>([]);
    const [types, setTypes] = useState<ItemType[]>([]);
    const [filters, setFilters] = useState({ type_id: '', keyword: '' });

    useEffect(() => {
        fetchTypes();
        fetchItems();
    }, []);

    const fetchTypes = async () => { /* ...保持不变... */ 
        try {
            const res = await api.get<ItemType[]>('/types');
            setTypes(res.data);
        } catch (error) { console.error(error); }
    };

    const fetchItems = async () => { /* ...保持不变... */
        try {
            const params: any = {};
            if (filters.type_id) params.type_id = filters.type_id;
            if (filters.keyword) params.keyword = filters.keyword;
            const res = await api.get<Item[]>('/items', { params });
            setItems(res.data);
        } catch (error) { console.error(error); }
    };

    const handleDelete = async (id: number) => { /* ...保持不变... */
        if (!window.confirm("确认删除?")) return;
        try { await api.delete(`/items/${id}`); fetchItems(); } catch (err) { alert("删除失败"); }
    };

    return (
        <div>
            <h2>物品列表</h2>
            
            {/* 1. 统一使用 App.css 的 .filter-bar */}
            <div className="filter-bar">
                <select 
                    onChange={(e) => setFilters({ ...filters, type_id: e.target.value })}
                    // 2. 统一使用 .control-input
                    className="control-input"
                >
                    <option value="">所有分类</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                
                <input 
                    type="text"
                    placeholder="搜索关键字..." 
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    // 3. 统一使用 .control-input 并加上 .flex-grow 自动撑开
                    className="control-input flex-grow"
                />
                
                <button 
                    onClick={fetchItems} 
                    // 4. 统一使用 .btn-action .btn-primary，并靠右对齐
                    className="btn-action btn-primary push-right"
                >
                    搜索
                </button>
            </div>

            <div className="dashboard-grid">
                {items.map(item => (
                    <div key={item.id} className="dashboard-card">
                        <div>
                            <h3>
                                {item.name} 
                                <span className="dashboard-category-tag">({item.type_name})</span>
                            </h3>
                            <p className="dashboard-desc">{item.description}</p>
                            <ul className="dashboard-list">
                                {Object.entries(item.attributes).map(([key, val]) => (
                                    <li key={key}><strong>{key}:</strong> {String(val)}</li>
                                ))}
                                <li><strong>地址:</strong> {item.address}</li>
                                <li><strong>发布人:</strong> {item.owner}</li>
                            </ul>
                        </div>

                        {(user && (user.username === item.owner || user.role === 'admin')) && (
                            <button 
                                onClick={() => handleDelete(item.id)} 
                                // 5. 统一使用 .btn-danger-outline
                                className="btn-danger-outline push-right"
                                style={{ marginTop: '15px' }} 
                            >
                                删除
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;