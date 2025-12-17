// src/pages/Dashboard.tsx
// 主页/仪表盘

import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { type Item, type ItemType } from '../types';

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
        const res = await api.get<ItemType[]>('/types');
        setTypes(res.data);
    };

    const fetchItems = async () => {
        const params: any = {};
        if (filters.type_id) params.type_id = filters.type_id;
        if (filters.keyword) params.keyword = filters.keyword;
        
        const res = await api.get<Item[]>('/items', { params });
        setItems(res.data);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("确认删除?")) return;
        try {
            await api.delete(`/items/${id}`);
            // 重新加载数据
            fetchItems();
        } catch (err) {
            alert("删除失败");
        }
    };

    return (
        <div>
            <h2>物品列表</h2>
            <div style={{ marginBottom: '20px' }}>
                <select onChange={(e) => setFilters({ ...filters, type_id: e.target.value })}>
                    <option value="">所有分类</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input 
                    placeholder="搜索关键字..." 
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    style={{ marginLeft: '10px' }}
                />
                <button onClick={fetchItems} style={{ marginLeft: '10px' }}>搜索</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {items.map(item => (
                    <div key={item.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
                        <h3>{item.name} <span style={{ fontSize: '12px', color: '#666' }}>({item.type_name})</span></h3>
                        <p>{item.description}</p>
                        <ul style={{ fontSize: '14px', color: '#555', listStyle: 'none', paddingLeft: 0 }}>
                            {Object.entries(item.attributes).map(([key, val]) => (
                                <li key={key}><strong>{key}:</strong> {String(val)}</li>
                            ))}
                            <li><strong>地址:</strong> {item.address}</li>
                            <li><strong>发布人:</strong> {item.owner}</li>
                        </ul>
                        {(user && (user.username === item.owner || user.role === 'admin')) && (
                            <button onClick={() => handleDelete(item.id)} style={{ color: 'red', marginTop: '10px' }}>删除</button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;