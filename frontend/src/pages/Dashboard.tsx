// src/pages/Dashboard.tsx

import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { type Item, type ItemType } from '../types';
import Loading from '../components/Loading';
import './Dashboard.css';

const API_BASE_URL = 'http://localhost:5000'; 

// 预定义莫兰迪色系
const MORANDI_COLORS = [
    ['#B5C7D3', '#E6EBF0'], ['#D8C4B6', '#F2EBE5'], 
    ['#C4D7D1', '#E8F1EE'], ['#BFB5D3', '#EBE7F2'], 
    ['#D3B5B5', '#F0E6E6'], ['#D3CDC4', '#F0EFEA'], 
];

// ✨ 新增：状态标签组件 (提取出来复用)
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const isAvailable = status === 'available';
    return (
        <span className={`status-tag ${isAvailable ? 'tag-available' : 'tag-taken'}`}>
            {isAvailable ? '待领取' : '已领走'}
        </span>
    );
};

const Dashboard: React.FC = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [items, setItems] = useState<Item[]>([]);
    const [types, setTypes] = useState<ItemType[]>([]);
    
    const [filters, setFilters] = useState({ type_id: '', keyword: '' });
    const [onlyMyItems, setOnlyMyItems] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchTypes(), fetchItems(false)]); 
            } catch (error) { console.error("Initialization failed", error); } 
            finally { setLoading(false); }
        };
        initData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { fetchItems(true); }, [onlyMyItems]);

    const fetchTypes = async () => {
        try { const res = await api.get<ItemType[]>('/types'); setTypes(res.data); } catch (error) { console.error(error); }
    };

    const fetchItems = async (shouldSetLoading = true) => {
        if (shouldSetLoading) setLoading(true);
        try {
            const params: any = {};
            if (filters.type_id) params.type_id = filters.type_id;
            if (filters.keyword) params.keyword = filters.keyword;
            if (onlyMyItems && user?.id) params.owner_id = user.id;

            const res = await api.get<Item[]>('/items', { params });
            setItems(res.data);
        } catch (error) { console.error(error); } 
        finally { if (shouldSetLoading) setLoading(false); }
    };

    const handleSearch = () => fetchItems(true);

    const handleDelete = async (id: number) => {
        if (!window.confirm("确认删除?")) return;
        try { 
            await api.delete(`/items/${id}`); 
            setSelectedItem(null);
            fetchItems(true); 
        } catch (err) { alert("删除失败"); }
    };

    const getItemTypeDefinition = (typeName: string) => types.find(t => t.name === typeName);

    const getMorandiGradient = (id: number) => {
        const index = id % MORANDI_COLORS.length;
        const [c1, c2] = MORANDI_COLORS[index];
        return `linear-gradient(45deg, ${c1}, ${c2})`;
    };

    // 渲染详情模态框内容
    const renderModalContent = () => {
        if (!selectedItem) return null;
        const typeDef = getItemTypeDefinition(selectedItem.type_name);

        return (
            <div className="modal-body-layout">
                <div className="modal-left-col">
                    {selectedItem.image_path ? (
                        <img 
                            src={`${API_BASE_URL}${selectedItem.image_path}`} 
                            alt={selectedItem.name} 
                            className="modal-image"
                        />
                    ) : (
                        <div 
                            className="modal-no-image"
                            style={{ background: getMorandiGradient(selectedItem.id) }}
                        >
                            {/* ✨ 已移除中间的文字 */}
                        </div>
                    )}
                </div>

                <div className="modal-right-col">
                    <div className="modal-header">
                        {/* ✨ 标题和状态并在 */}
                        <div className="header-title-group">
                            <h2>{selectedItem.name}</h2>
                            <StatusBadge status={selectedItem.status} />
                        </div>
                    </div>

                    <p className="modal-category">分类: {selectedItem.type_name}</p>
                    <div className="modal-desc">{selectedItem.description || "暂无描述"}</div>

                    <div className="modal-attributes">
                        {typeDef ? (
                            typeDef.attributes.map(attr => {
                                const val = selectedItem.attributes[attr.key];
                                if (val === undefined || val === null || val === '') return null;
                                return (
                                    <div key={attr.key} className="attr-row">
                                        <span className="attr-label">{attr.label}</span>
                                        <span className="attr-value">{String(val)}</span>
                                    </div>
                                );
                            })
                        ) : (
                            Object.entries(selectedItem.attributes).map(([key, val]) => (
                                <div key={key} className="attr-row">
                                    <span className="attr-label">{key}</span>
                                    <span className="attr-value">{String(val)}</span>
                                </div>
                            ))
                        )}
                        <div className="attr-row">
                            <span className="attr-label">发布人</span>
                            <span className="attr-value">{selectedItem.owner}</span>
                        </div>
                        <div className="attr-row">
                            <span className="attr-label">地址</span>
                            <span className="attr-value">{selectedItem.address}</span>
                        </div>
                        <div className="attr-row">
                            <span className="attr-label">时间</span>
                            <span className="attr-value">{new Date(selectedItem.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {(user && (user.username === selectedItem.owner || user.role === 'admin')) && (
                        <div className="modal-actions">
                            <button 
                                onClick={() => navigate(`/edit-item/${selectedItem.id}`)}
                                className="btn-action btn-secondary"
                                style={{ flex: 1 }}
                            >
                                编辑
                            </button>
                            <button 
                                onClick={() => handleDelete(selectedItem.id)} 
                                className="btn-danger-outline"
                                style={{ flex: 1 }}
                            >
                                删除
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <Loading />;

    return (
        <div className="page-container">
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
                    placeholder="搜索..." 
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    className="control-input flex-grow"
                    value={filters.keyword}
                />
                {user && (
                    <button 
                        onClick={() => setOnlyMyItems(!onlyMyItems)}
                        className={`btn-action ${onlyMyItems ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        {onlyMyItems ? '查看全部' : '只看我的'}
                    </button>
                )}
                <button onClick={handleSearch} className="btn-action btn-primary">搜索</button>
            </div>

            {items.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>暂无物品</p>
            ) : (
                <div className="dashboard-grid">
                    {items.map(item => (
                        <div 
                            key={item.id} 
                            className="dashboard-card"
                            onClick={() => setSelectedItem(item)}
                        >
                            <div className="card-bg-layer">
                                {item.image_path ? (
                                    <img 
                                        src={`${API_BASE_URL}${item.image_path}`} 
                                        alt={item.name} 
                                        loading="lazy" 
                                    />
                                ) : (
                                    <div 
                                        className="no-image-gradient"
                                        style={{ background: getMorandiGradient(item.id) }} 
                                    />
                                )}
                            </div>

                            <div className="card-overlay">
                                {/* ✨ 左侧：名字 + 标签 */}
                                <div className="overlay-left">
                                    <span className="overlay-text-name">{item.name}</span>
                                    <StatusBadge status={item.status} />
                                </div>
                                <span className="overlay-text-owner">@{item.owner}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedItem && (
                <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
                    <div 
                        className="modal-container" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="modal-close-btn" onClick={() => setSelectedItem(null)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        {renderModalContent()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;