// src/pages/Dashboard.tsx

import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { type Item, type ItemType } from '../types';
import './Dashboard.css'; // 引入刚才创建的 CSS 文件

const Dashboard: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [items, setItems] = useState<Item[]>([]);
    const [types, setTypes] = useState<ItemType[]>([]);
    const [filters, setFilters] = useState({ type_id: '', keyword: '' });

    useEffect(() => {
        fetchTypes();
        fetchItems();
    }, []);

    const fetchTypes = async () => {
        try {
            const res = await api.get<ItemType[]>('/types');
            setTypes(res.data);
        } catch (error) {
            console.error("Failed to fetch types", error);
        }
    };

    const fetchItems = async () => {
        try {
            const params: any = {};
            if (filters.type_id) params.type_id = filters.type_id;
            if (filters.keyword) params.keyword = filters.keyword;
            
            const res = await api.get<Item[]>('/items', { params });
            setItems(res.data);
        } catch (error) {
            console.error("Failed to fetch items", error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("确认删除?")) return;
        try {
            await api.delete(`/items/${id}`);
            fetchItems();
        } catch (err) {
            alert("删除失败");
        }
    };

    return (
        <div>
            <h2>物品列表</h2>
            
            {/* 搜索过滤区域 */}
            <div className="dashboard-filter-bar">
                <select 
                    onChange={(e) => setFilters({ ...filters, type_id: e.target.value })}
                    className="dashboard-control dashboard-select"
                >
                    <option value="">所有分类</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                
                <input 
                    type="text"
                    placeholder="搜索关键字..." 
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    className="dashboard-control dashboard-input"
                />
                
                <button 
                    onClick={fetchItems} 
                    className="dashboard-control dashboard-btn-search"
                >
                    搜索
                </button>
            </div>

            {/* 物品卡片网格 */}
            <div className="dashboard-grid">
                {items.map(item => (
                    <div key={item.id} className="dashboard-card">
                        <div>
                            <h3>
                                {item.name} 
                                <span className="dashboard-category-tag">
                                    ({item.type_name})
                                </span>
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
                                className="dashboard-btn-delete"
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