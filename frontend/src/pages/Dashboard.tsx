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

// ✨✨ 新增：图片预加载辅助函数 ✨✨
// 返回一个 Promise，无论图片加载成功还是失败，都会 resolve，防止因为一张图片 404 导致整个页面卡死
const preloadImage = (src: string) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false); // 即使失败也继续，不阻塞后续流程
    });
};

const Dashboard: React.FC = () => {
    // ... 其他状态保持不变 ...
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [items, setItems] = useState<Item[]>([]);
    const [types, setTypes] = useState<ItemType[]>([]);
    const [filters, setFilters] = useState({ type_id: '', keyword: '', status: 'available' });
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

    // ✨✨ 修改：fetchItems 函数 ✨✨
    const fetchItems = async (shouldSetLoading = true) => {
        if (shouldSetLoading) setLoading(true);
        try {
            const params: any = {};
            if (filters.type_id) params.type_id = filters.type_id;
            if (filters.keyword) params.keyword = filters.keyword;
            // 新增 status 参数
            if (filters.status) params.status = filters.status;
            
            if (onlyMyItems && user?.id) params.owner_id = user.id;

            const res = await api.get<Item[]>('/items', { params });
            
            setItems(res.data);

            const imagePromises = res.data
                .filter(item => item.image_path)
                .map(item => preloadImage(`${API_BASE_URL}${item.image_path}`));

            if (imagePromises.length > 0) {
                await Promise.all(imagePromises);
            }

        } catch (error) { 
            console.error(error); 
        } finally { 
            if (shouldSetLoading) setLoading(false); 
        }
    };

    // ✨✨ 新增：重置筛选功能 ✨✨
    const handleReset = () => {
        setFilters({ type_id: '', keyword: '', status: '' }); // 重置所有条件
        setOnlyMyItems(false);
        // 这里需要一个小技巧：由于 setState 是异步的，直接调用 fetchItems 可能还是旧状态
        // 我们最好通过 useEffect 监听 filters 变化，或者手动传入空参数调用
        // 简单起见，我们做一个延时，或者依赖 useEffect，这里我们改用 useEffect 监听 filters 变化自动搜索会更现代
    };

    // 💡 建议优化：让筛选条件的改变自动触发搜索（除 Keyword 外，避免输入时频繁请求）
    // 如果你希望下拉菜单改变就立即刷新，可以使用下面的 useEffect：
    useEffect(() => {
        fetchItems(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.type_id, filters.status, onlyMyItems]); 
    // 注意：不要把 filters.keyword 放进去，否则每打一个字都会请求

    // ✨✨ 新增：布局配置状态 ✨✨
    const [layoutConfig, setLayoutConfig] = useState({
        minWidth: 360,     // 对应 grid minmax 的像素值
        aspectRatio: 1.33, // 对应 4/3 ≈ 1.33
    });

    // ✨✨ 新增：控制面板显隐状态 ✨✨
    const [showViewSettings, setShowViewSettings] = useState(false);

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
            {/* ✨✨ 3. 增强版 Filter Bar ✨✨ */}
            <div className="filter-bar">
                {/* 分类筛选 */}
                <select 
                    onChange={(e) => setFilters({ ...filters, type_id: e.target.value })}
                    className="control-input"
                    value={filters.type_id}
                >
                    <option value="">所有分类</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>

                {/* ✨ 新增：状态筛选 */}
                <select 
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="control-input"
                    value={filters.status}
                    style={{ minWidth: '110px' }}
                >
                    <option value="">全部状态</option>
                    <option value="available">待领取</option>
                    <option value="taken">已领走</option>
                </select>

                {/* 关键词搜索 */}
                <div className="search-group flex-grow">
                    <input 
                        type="text"
                        placeholder="搜索物品名称、描述..." 
                        onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()} // 回车搜索
                        className="control-input search-input"
                        style={{ width: '100%', margin: 0 }} // 覆盖默认margin
                        value={filters.keyword}
                    />
                </div>

                {/* 按钮组 */}
                <div className="filter-actions">
                    <button onClick={handleSearch} className="btn-action btn-primary">搜索</button>
                    
                    {/* 清空/重置按钮 */}
                    {(filters.type_id || filters.status || filters.keyword || onlyMyItems) && (
                        <button onClick={handleReset} className="btn-action btn-secondary" title="重置所有筛选">
                            ↺
                        </button>
                    )}

                    {user && (
                        <button 
                            onClick={() => setOnlyMyItems(!onlyMyItems)}
                            className={`btn-action ${onlyMyItems ? 'btn-primary' : 'btn-secondary'}`}
                            title="只看我发布的"
                        >
                            {onlyMyItems ? '我的物品' : '全部物品'}
                        </button>
                    )}

                    {/* 视图切换按钮 (保持原有) */}
                    <button 
                        onClick={() => setShowViewSettings(!showViewSettings)}
                        className={`btn-action ${showViewSettings ? 'btn-primary' : 'btn-secondary'}`}
                        title="调整视图布局"
                        style={{ padding: '0 10px' }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* ✨✨ 新增：视图控制面板 (可折叠) ✨✨ */}
            {showViewSettings && (
                <div style={{
                    background: '#fff',
                    padding: '15px 20px',
                    marginBottom: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '30px',
                    alignItems: 'center',
                    border: '1px solid #eee'
                }}>
                    {/* 卡片宽度控制 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>
                            卡片大小 (最小宽度): {layoutConfig.minWidth}px
                        </label>
                        <input 
                            type="range" 
                            min="150" 
                            max="500" 
                            step="10" 
                            value={layoutConfig.minWidth}
                            onChange={(e) => setLayoutConfig({...layoutConfig, minWidth: Number(e.target.value)})}
                            style={{ width: '200px', cursor: 'pointer' }}
                        />
                    </div>

                    {/* 卡片比例控制 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', color: '#666', fontWeight: 600 }}>
                            长宽比 (Aspect Ratio): {layoutConfig.aspectRatio.toFixed(2)}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input 
                                type="range" 
                                min="0.5" 
                                max="2.0" 
                                step="0.01" 
                                value={layoutConfig.aspectRatio}
                                onChange={(e) => setLayoutConfig({...layoutConfig, aspectRatio: Number(e.target.value)})}
                                style={{ width: '200px', cursor: 'pointer' }}
                            />
                            {/* 快速预设按钮 */}
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button 
                                    onClick={() => setLayoutConfig({...layoutConfig, aspectRatio: 9/16})}
                                    style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                                >9:16</button>
                                <button 
                                    onClick={() => setLayoutConfig({...layoutConfig, aspectRatio: 3/4})}
                                    style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                                >3:4</button>
                                <button 
                                    onClick={() => setLayoutConfig({...layoutConfig, aspectRatio: 1})}
                                    style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                                >1:1</button>
                                <button 
                                    onClick={() => setLayoutConfig({...layoutConfig, aspectRatio: 4/3})}
                                    style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                                >4:3</button>
                                <button 
                                    onClick={() => setLayoutConfig({...layoutConfig, aspectRatio: 16/9})}
                                    style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}
                                >16:9</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {items.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>暂无物品</p>
            ) : (
                <div 
                    className="dashboard-grid"
                    // ✨✨ 核心修改：通过 style 注入 CSS 变量 ✨✨
                    style={{
                        '--card-min-width': `${layoutConfig.minWidth}px`,
                        '--card-aspect-ratio': layoutConfig.aspectRatio
                    } as React.CSSProperties}
                >
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