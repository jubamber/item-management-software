// src/pages/AddItem.tsx
// 添加物品

import React, { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { type ItemType } from '../types';
import ImageUploader from '../components/ImageUploader';
import './AddItem.css';

const AddItem: React.FC = () => {
    const navigate = useNavigate();
    const [types, setTypes] = useState<ItemType[]>([]);
    const [selectedType, setSelectedType] = useState<ItemType | null>(null);
    
    // 基础表单数据
    const [formData, setFormData] = useState({
        name: '', description: '', address: '', phone: '', email: '', image_path: ''
    });
    
    // 动态属性数据 (Key-Value)
    const [attrData, setAttrData] = useState<Record<string, string>>({});

    useEffect(() => {
        api.get<ItemType[]>('/types').then(res => setTypes(res.data));
    }, []);

    const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const typeId = parseInt(e.target.value);
        const type = types.find(t => t.id === typeId) || null;
        setSelectedType(type);
        setAttrData({}); // 切换类型时重置动态属性
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedType) return;

        try {
            await api.post('/items', {
                type_id: selectedType.id,
                ...formData,
                attributes: attrData
            });
            alert('发布成功');
            navigate('/');
        } catch (err) {
            console.error(err);
            alert('发布失败');
        }
    };

    return (
        <div className="page-container">
        <div className="add-item-container">
            <h2>发布新物品</h2>
            <form onSubmit={handleSubmit} className="add-item-form">
                
                {/* --- 修改开始：增加一个包裹层 form-content --- */}
                <div className="form-content">
                    
                    {/* 左侧栏 */}
                    <div className="form-left">
                        <div className="form-group">
                            <label>物品类型 <span style={{color: 'red'}}>*</span>:</label>
                            <select required onChange={handleTypeChange} defaultValue="">
                                <option value="">-- 请选择 --</option>
                                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        {selectedType && (
                        <>
                            <div className="form-group">
                                <label>物品名称 <span style={{color: 'red'}}>*</span>:</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                />
                            </div>
                            <div className="form-group">
                                <label>描述:</label>
                                <textarea 
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
                        </>
                        )}
                    </div>

                    {/* 右侧栏 */}
                    {selectedType && (
                        <div className="form-right">
                        <h4>{selectedType.name} 特有属性</h4>
                        {selectedType.attributes.map(attr => (
                            <div key={attr.key} className="form-group">
                            <label>
                                {attr.label}{attr.required && <span style={{color:'red'}}> *</span>}:
                            </label>
                            {attr.type === 'select' && attr.options ? (
                                <select
                                required={attr.required}
                                value={attrData[attr.key] || ''}
                                onChange={e => setAttrData(prev => ({...prev, [attr.key]: e.target.value}))}
                                >
                                <option value="">-- 请选择 --</option>
                                {attr.options.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                ))}
                                </select>
                            ) : (
                                <input
                                type={attr.type === 'number' ? 'number' : attr.type === 'date' ? 'date' : 'text'}
                                required={attr.required}
                                value={attrData[attr.key] || ''}
                                onChange={e => setAttrData(prev => ({...prev, [attr.key]: e.target.value}))}
                                />
                            )}
                            </div>
                        ))}
                        </div>
                    )}
                </div> 
                {/* --- 修改结束：form-content 包裹层结束 --- */}

                {/* 按钮在 form-content 之外，form 之内 */}
                {selectedType && (
                    <>
                    {/* 图片上传组件 */}
                    <div className="form-group">
                        <label>物品示意图:</label>
                        
                        {/* 
                           使用 form-content 复用栅格布局 
                           添加 conditional class: has-image 用来控制宽度切换
                        */}
                        <div className={`form-content image-upload-section ${formData.image_path ? 'has-image' : ''}`}>
                            
                            {/* 左侧：上传组件 */}
                            <div className="form-left" style={{ display: 'flex', alignItems: 'center'}}>
                                <ImageUploader 
                                    onImageUploaded={(path) => setFormData({ ...formData, image_path: path })}
                                />
                                {/* 如果你想让用户知道可以替换，可以在这里加个小提示 */}
                            </div>

                            {/* 右侧：预览图片 (仅在有图片时显示) */}
                            {formData.image_path && (
                                /* 添加 preview-wrapper 类名以便 CSS 控制垂直居中 */
                                <div className="form-right preview-wrapper"> 
                                    <div className="uploaded-preview-container">
                                        <img 
                                            src={`http://localhost:5000${formData.image_path}`} 
                                            alt="已上传预览" 
                                            className="uploaded-preview-img"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 提交按钮 */}
                    <button type="submit">提交物品</button>
                    </>
                )}
            </form>
        </div>
        </div>
    );
};

export default AddItem;