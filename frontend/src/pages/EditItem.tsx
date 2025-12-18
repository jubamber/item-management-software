import React, { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { type Item, type ItemType } from '../types';
import Loading from '../components/Loading';
import './EditItem.css'; // <--- 引入样式文件

const EditItem: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [currentType, setCurrentType] = useState<ItemType | null>(null);

    const [formData, setFormData] = useState({
        name: '', description: '', address: '', phone: '', email: '', status: 'available'
    });
    
    const [attrData, setAttrData] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 模拟获取数据逻辑不变...
                const [typesRes, allItems] = await Promise.all([
                    api.get<ItemType[]>('/types'),
                    api.get<Item[]>('/items') 
                ]);
                
                const item = allItems.data.find(i => i.id === Number(id));

                if (!item) {
                    alert("物品不存在");
                    navigate('/');
                    return;
                }

                setFormData({
                    name: item.name,
                    description: item.description,
                    address: item.address,
                    phone: '', 
                    email: '', 
                    status: item.status
                });
                
                setAttrData(item.attributes);

                const typeName = item.type_name;
                const foundType = typesRes.data.find(t => t.name === typeName);
                if (foundType) setCurrentType(foundType);

            } catch (err) {
                console.error(err);
                alert("加载失败");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, navigate]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/items/${id}`, {
                ...formData,
                attributes: attrData
            });
            alert('修改成功');
            navigate('/');
        } catch (err) {
            alert('修改失败');
        }
    };

    if (loading) return <Loading />;

    return (
        // 1. 使用 CSS 类替代 inline style
        <div className="edit-item-container">
            <h2>编辑物品 / 更新状态</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>物品名称:</label>
                    <input 
                        required 
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                </div>
                
                {/* 2. 应用 CSS 类并添加 data-status 属性以实现颜色变化 */}
                <div className="form-group">
                    <label>状态 (点击切换):</label>
                    <div className="status-toggle-container">
                        {/* 选项 1: Available */}
                        <button
                            type="button" // 防止提交表单
                            className={`status-btn available ${formData.status === 'available' ? 'active' : ''}`}
                            onClick={() => setFormData({ ...formData, status: 'available' })}
                        >
                            🟢 待领取
                        </button>

                        {/* 选项 2: Taken */}
                        <button
                            type="button" // 防止提交表单
                            className={`status-btn taken ${formData.status === 'taken' ? 'active' : ''}`}
                            onClick={() => setFormData({ ...formData, status: 'taken' })}
                        >
                            🔴 已领走
                        </button>
                    </div>
                </div>


                <div className="form-group">
                    <label>描述:</label>
                    <textarea 
                        rows={4} // 增加默认行数
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                    />
                </div>
                <div className="form-group">
                    <label>地址:</label>
                    <input 
                        type="text" 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                    />
                </div>

                {currentType && (
                    <>
                        {/* 3. 这里的 h4 现在有了漂亮的样式 */}
                        <h4>{currentType.name} 专属属性</h4>
                        {currentType.attributes.map(attr => (
                            <div key={attr.key} className="form-group">
                                <label>{attr.label}:</label>
                                <input 
                                    type={attr.type === 'number' ? 'number' : attr.type === 'date' ? 'date' : 'text'}
                                    value={attrData[attr.label] || ''}
                                    onChange={e => setAttrData(prev => ({...prev, [attr.label]: e.target.value}))}
                                />
                            </div>
                        ))}
                    </>
                )}

                {/* 4. 按钮组容器 */}
                <div className="form-actions">
                    {/* 类型为 button 防止触发表单提交 */}
                    <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
                        取消
                    </button>
                    <button type="submit">
                        保存修改
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditItem;