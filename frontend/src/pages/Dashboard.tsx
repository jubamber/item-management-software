// src/pages/Dashboard.tsx

import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { type Item, type ItemType } from '../types';
import Loading from '../components/Loading';
import './Dashboard.css';

const API_BASE_URL = 'http://localhost:5000'; 

// ✨✨ 核心修改：无限莫兰迪色生成器 ✨✨
const generateMorandiGradient = (id: number) => {
    // 使用 Math.sin(id * seed) 确保同一个 ID 总是得到相同的结果
    // 避免使用 Math.random()，否则每次组件重绘颜色都会闪烁
    const pseudoRandom = (seed: number) => {
        const x = Math.sin(id * 9999 * seed) * 10000;
        return x - Math.floor(x);
    };

    // 参数调优：
    // Hue: 0-360 (全色域)
    // Saturation: 15-35% (低饱和度，灰感)
    // Lightness: 75-88% (高明度，透亮感)
    
    const h = Math.floor(pseudoRandom(1) * 360); 
    const s = Math.floor(pseudoRandom(2) * 20) + 15; 
    const l = Math.floor(pseudoRandom(3) * 13) + 75; 

    // 渐变色：在原色相基础上偏移 45度左右，亮度微调
    const h2 = (h + 45) % 360;
    const s2 = s + 5;
    const l2 = l + 5;

    return `linear-gradient(135deg, hsl(${h}, ${s}%, ${l}%), hsl(${h2}, ${s2}%, ${l2}%))`;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const isAvailable = status === 'available';
    return (
        <span className={`status-tag ${isAvailable ? 'tag-available' : 'tag-taken'}`}>
            {isAvailable ? '待领取' : '已领走'}
        </span>
    );
};

const Dashboard: React.FC = () => {
    // ... 其他状态保持不变 ...
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [items, setItems] = useState<Item[]>([]);
    const [types, setTypes] = useState<ItemType[]>([]);
    const [filters, setFilters] = useState({ type_id: '', keyword: '' });
    const [onlyMyItems, setOnlyMyItems] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    // ... useEffects 和 fetch 逻辑保持不变 ...

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

    // ✨ 注意：原来的 getMorandiGradient 函数已经移除，直接使用外部定义的那个

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
                            // ✨ 调用新的生成函数
                            style={{ background: generateMorandiGradient(selectedItem.id) }}
                        >
                        </div>
                    )}
                </div>
                {/* ... Modal 右侧内容保持不变 ... */}
                <div className="modal-right-col">
                    <div className="modal-header">
                        <div className="header-title-group">
                            <h2>{selectedItem.name}</h2>
                            <StatusBadge status={selectedItem.status} />
                        </div>
                    </div>
                    {/* ... 其余属性渲染保持不变 ... */}
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
            {/* ... Filter Bar 保持不变 ... */}
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
                                        // ✨ 列表项也自动应用新的生成函数
                                        style={{ background: generateMorandiGradient(item.id) }} 
                                    />
                                )}
                            </div>

                            <div className="card-overlay">
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
            
            {/* ... Modal Backdrop 保持不变 ... */}
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