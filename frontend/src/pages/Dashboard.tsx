// src/pages/Dashboard.tsx

import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { type Item, type ItemType } from '../types';
import Loading from '../components/Loading'; // 1. 引入 Loading 组件
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [items, setItems] = useState<Item[]>([]);
    const [types, setTypes] = useState<ItemType[]>([]);
    const [filters, setFilters] = useState({ type_id: '', keyword: '' });
    
    // 2. 新增 loading 状态
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 3. 使用 async 函数包裹初始化逻辑，等待所有数据就绪
        const initData = async () => {
            setLoading(true);
            try {
                // 使用 Promise.all 并行请求分类和列表，
                // 确保分类数据加载完后再渲染页面，避免下拉框宽度跳变
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

    const fetchTypes = async () => {
        try {
            const res = await api.get<ItemType[]>('/types');
            setTypes(res.data);
        } catch (error) { console.error(error); }
    };

    // 修改 fetchItems，增加手动控制 loading 的参数（默认为 true，初始化时传 false 避免重复 set）
    const fetchItems = async (shouldSetLoading = true) => {
        if (shouldSetLoading) setLoading(true);
        try {
            const params: any = {};
            if (filters.type_id) params.type_id = filters.type_id;
            if (filters.keyword) params.keyword = filters.keyword;
            const res = await api.get<Item[]>('/items', { params });
            setItems(res.data);
        } catch (error) { 
            console.error(error); 
        } finally {
            if (shouldSetLoading) setLoading(false);
        }
    };

    // 处理搜索按钮点击
    const handleSearch = () => {
        fetchItems(true); // 搜索时显式开启 loading
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("确认删除?")) return;
        try { 
            // 删除时也可以选择开启 loading，或者只刷新列表
            await api.delete(`/items/${id}`); 
            fetchItems(true); 
        } catch (err) { alert("删除失败"); }
    };

    // 4. 参考 AdminPanel，在加载中时显示 Loading 组件
    // 这能彻底解决布局跳动问题，因为数据没准备好前不渲染 DOM
    if (loading) {
        return <Loading />;
    }

    return (
        <div>
            <h2>物品列表</h2>
            
            <div className="filter-bar">
                <select 
                    onChange={(e) => setFilters({ ...filters, type_id: e.target.value })}
                    className="control-input"
                    value={filters.type_id} // 建议绑定 value
                >
                    <option value="">所有分类</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                
                <input 
                    type="text"
                    placeholder="搜索关键字..." 
                    onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                    className="control-input flex-grow"
                    value={filters.keyword} // 建议绑定 value
                />
                
                <button 
                    onClick={handleSearch} 
                    className="btn-action btn-primary push-right"
                    disabled={loading} // 防止重复点击
                >
                    {loading ? '搜索中...' : '搜索'}
                </button>
            </div>

            {/* 如果搜索结果为空的友好提示 */}
            {items.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
                    没有找到符合条件的物品
                </p>
            ) : (
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
                                    className="btn-danger-outline push-right"
                                    style={{ marginTop: '15px' }} 
                                >
                                    删除
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dashboard;