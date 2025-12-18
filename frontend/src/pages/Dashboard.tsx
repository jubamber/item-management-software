// src/pages/Dashboard.tsx

import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { type Item, type ItemType } from '../types';
import Loading from '../components/Loading';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [items, setItems] = useState<Item[]>([]);
    const [types, setTypes] = useState<ItemType[]>([]);
    
    // 状态管理
    const [filters, setFilters] = useState({ type_id: '', keyword: '' });
    const [onlyMyItems, setOnlyMyItems] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                // 并行获取类型定义和物品列表
                await Promise.all([fetchTypes(), fetchItems(false)]); 
            } catch (error) {
                console.error("Initialization failed", error);
            } finally {
                setLoading(false);
            }
        };
        initData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchItems(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onlyMyItems]);

    const fetchTypes = async () => {
        try {
            const res = await api.get<ItemType[]>('/types');
            setTypes(res.data);
        } catch (error) { console.error(error); }
    };

    const fetchItems = async (shouldSetLoading = true) => {
        if (shouldSetLoading) setLoading(true);
        try {
            const params: any = {};
            if (filters.type_id) params.type_id = filters.type_id;
            if (filters.keyword) params.keyword = filters.keyword;
            
            if (onlyMyItems && user?.id) {
                params.owner_id = user.id;
            }

            const res = await api.get<Item[]>('/items', { params });
            setItems(res.data);
        } catch (error) { 
            console.error(error); 
        } finally {
            if (shouldSetLoading) setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchItems(true);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("确认删除?")) return;
        try { 
            await api.delete(`/items/${id}`); 
            fetchItems(true); 
        } catch (err) { alert("删除失败"); }
    };

    // =========================================================================
    // ✨ 新增辅助函数：根据物品的 type_name 查找当前生效的类型定义
    // =========================================================================
    const getItemTypeDefinition = (typeName: string) => {
        return types.find(t => t.name === typeName);
    };

    if (loading) return <Loading />;

    return (
        <div>
            <h2>物品列表</h2>
            
            <div className="filter-bar">
                <select 
                    onChange={(e) => setFilters({ ...filters, type_id: e.target.value })}
                    className="control-input"
                    value={filters.type_id}
                >
                    <option value="">所有分类</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                
                <input 
                    type="text"
                    placeholder="搜索关键字..." 
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    className="control-input flex-grow"
                    value={filters.keyword}
                />

                {user && (
                    <button 
                        onClick={() => setOnlyMyItems(!onlyMyItems)}
                        className={`btn-action ${onlyMyItems ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ marginRight: '10px' }}
                    >
                        {onlyMyItems ? '查看全部' : '只看我的'}
                    </button>
                )}
                
                <button 
                    onClick={handleSearch} 
                    className="btn-action btn-primary"
                    disabled={loading}
                >
                    搜索
                </button>
            </div>

            {items.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
                    没有找到符合条件的物品
                </p>
            ) : (
                <div className="dashboard-grid">
                    {items.map(item => {
                        // ✨ 1. 获取该物品对应的类型定义
                        const typeDef = getItemTypeDefinition(item.type_name);

                        return (
                            <div key={item.id} className={`dashboard-card ${item.status === 'taken' ? 'card-taken' : ''}`}>
                                <div>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <h3>
                                            {item.name} 
                                            <span className="dashboard-category-tag">({item.type_name})</span>
                                        </h3>
                                        <span className={`status-badge ${item.status}`}>
                                            {item.status === 'available' ? '待领取' : '已领走'}
                                        </span>
                                    </div>
                                    
                                    <p className="dashboard-desc">{item.description}</p>
                                    
                                    <ul className="dashboard-list">
                                        {/* 
                                            ✨ 2. 核心修复逻辑：
                                            不遍历 item.attributes (死数据)，而是遍历 typeDef.attributes (活定义)。
                                            这样如果后台删除了某个属性，前端就不会再渲染它。
                                        */}
                                        {typeDef ? (
                                            typeDef.attributes.map(attr => {
                                                // 使用 key (如 'expiry_date') 去 items 数据里取值
                                                const val = item.attributes[attr.key];
                                                
                                                // 如果值为空/null/undefined，则不显示 (允许显示 0)
                                                if (val === undefined || val === null || val === '') return null;
                                                
                                                return (
                                                    <li key={attr.key}>
                                                        {/* 显示 Label (如 '保质期') */}
                                                        <strong>{attr.label}:</strong> {String(val)}
                                                    </li>
                                                );
                                            })
                                        ) : (
                                            // 降级处理：如果类型定义已经被删除了（typeDef 为空），
                                            // 也就是出现了"僵尸物品"，则还是按老方法显示所有原始数据，防止数据彻底不可见。
                                            Object.entries(item.attributes).map(([key, val]) => (
                                                <li key={key}><strong>{key}:</strong> {String(val)}</li>
                                            ))
                                        )}

                                        {/* 固定字段 */}
                                        <li><strong>地址:</strong> {item.address}</li>
                                        <li><strong>发布人:</strong> {item.owner}</li>
                                        <li><strong>发布时间:</strong> {item.created_at}</li>
                                    </ul>
                                </div>

                                {(user && (user.username === item.owner || user.role === 'admin')) && (
                                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button 
                                            onClick={() => navigate(`/edit-item/${item.id}`)}
                                            className="btn-action btn-secondary"
                                        >
                                            编辑 / 状态
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item.id)} 
                                            className="btn-danger-outline"
                                        >
                                            删除
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Dashboard;