// src/pages/AddItem.tsx
// 添加物品

import React, { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { type ItemType } from '../types';

const AddItem: React.FC = () => {
    const navigate = useNavigate();
    const [types, setTypes] = useState<ItemType[]>([]);
    const [selectedType, setSelectedType] = useState<ItemType | null>(null);
    
    // 基础表单数据
    const [formData, setFormData] = useState({
        name: '', description: '', address: '', phone: '', email: ''
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
        setAttrData({}); // 重置动态属性
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
            alert('发布失败');
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h2>发布新物品</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>物品类型:</label>
                    <select required onChange={handleTypeChange}>
                        <option value="">-- 请选择 --</option>
                        {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                {selectedType && (
                    <>
                        <div className="form-group">
                            <label>物品名称:</label>
                            <input required type="text" onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>描述:</label>
                            <textarea onChange={e => setFormData({...formData, description: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>地址:</label>
                            <input type="text" onChange={e => setFormData({...formData, address: e.target.value})} />
                        </div>
                        
                        <h4>{selectedType.name} 特有属性</h4>
                        {selectedType.attributes.map(attr => (
                            <div key={attr.key} className="form-group">
                                <label>{attr.label}:</label>
                                <input 
                                    type={attr.type === 'number' ? 'number' : attr.type === 'date' ? 'date' : 'text'}
                                    required
                                    // 动态设置属性值
                                    onChange={e => setAttrData(prev => ({...prev, [attr.label]: e.target.value}))}
                                />
                            </div>
                        ))}

                        <button type="submit" style={{ marginTop: '20px' }}>提交物品</button>
                    </>
                )}
            </form>
        </div>
    );
};

export default AddItem;