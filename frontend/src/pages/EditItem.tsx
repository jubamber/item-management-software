// src/pages/EditItem.tsx

import React, { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { type Item, type ItemType } from '../types';
import Loading from '../components/Loading';
import ImageUploader from '../components/ImageUploader';
import './EditItem.css';

const EditItem: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [currentType, setCurrentType] = useState<ItemType | null>(null);

    const [formData, setFormData] = useState({
        name: '', description: '', address: '', phone: '', email: '', status: 'available', image_path: ''
    });
    
    const [attrData, setAttrData] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
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
                    phone: '', // API 返回中可能没有这些字段，视后端而定
                    email: '', 
                    status: item.status,
                    image_path: item.image_path || '' 
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
        
        // --- 可选：额外的逻辑校验 ---
        // 虽然 HTML required 属性会阻止提交，但为了双重保险，也可以在这里检查
        if (currentType) {
            for (const attr of currentType.attributes) {
                if (attr.required && (!attrData[attr.key] || attrData[attr.key].trim() === '')) {
                    alert(`请填写必填项: ${attr.label}`);
                    return;
                }
            }
        }
        // -------------------------

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
        <div className="page-container-narrow">
        <div className="edit-item-container">
            <h2>编辑物品 / 更新状态</h2>
            <form onSubmit={handleSubmit}>
                {/* 1. 插入图片上传组件 */}
                <div className="form-group">
                    <ImageUploader 
                        currentImage={formData.image_path}
                        onImageUploaded={(path) => setFormData({...formData, image_path: path})}
                    />
                </div>
                <div className="form-group">
                    <label>物品名称 <span style={{color: 'red'}}>*</span>:</label>
                    <input 
                        required // 基础字段必填
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                </div>
                
                <div className="form-group">
                    <label>状态 (点击切换):</label>
                    <div className="status-toggle-container">
                        <button
                            type="button"
                            className={`status-btn available ${formData.status === 'available' ? 'active' : ''}`}
                            onClick={() => setFormData({ ...formData, status: 'available' })}
                        >
                            🟢 待领取
                        </button>

                        <button
                            type="button"
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
                        rows={4}
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
                        <h4>{currentType.name} 专属属性</h4>
                        {currentType.attributes.map(attr => (
                            <div key={attr.key} className="form-group">
                                <label>
                                    {attr.label}
                                    {/* 修改点 1: 显示红色星号提示用户该项必填 */}
                                    {attr.required && <span style={{color: 'red', marginLeft: '4px'}}>*</span>}
                                    :
                                </label>
                                
                                {/* 修改点 2: 根据类型渲染 input 或 select，并绑定 required 属性 */}
                                {attr.type === 'select' && attr.options ? (
                                    <select
                                        required={attr.required} // <--- 关键修改：HTML5 必填校验
                                        value={attrData[attr.key] || ''}
                                        onChange={e => setAttrData(prev => ({...prev, [attr.key]: e.target.value}))}
                                        // 添加样式类以便统一控制
                                        style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} 
                                    >
                                        <option value="">-- 请选择 --</option>
                                        {attr.options.map((opt, idx) => (
                                            <option key={idx} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input 
                                        type={attr.type === 'number' ? 'number' : attr.type === 'date' ? 'date' : 'text'}
                                        required={attr.required} // <--- 关键修改：HTML5 必填校验
                                        value={attrData[attr.key] || ''} 
                                        onChange={e => setAttrData(prev => ({...prev, [attr.key]: e.target.value}))}
                                    />
                                )}
                            </div>
                        ))}
                    </>
                )}

                <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
                        取消
                    </button>
                    <button type="submit">
                        保存修改
                    </button>
                </div>
            </form>
        </div>
        </div>
    );
};

export default EditItem;