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
                        <ImageUploader 
                        currentImage={null}
                        onImageUploaded={(path) => setFormData({ ...formData, image_path: path })}
                        />
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