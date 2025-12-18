// src/pages/Profile.tsx

import React, { useState, useEffect, useContext, type FormEvent } from 'react';
import api from '../api';
import { AuthContext } from '../AuthContext';
import Loading from '../components/Loading';
import './Profile.css';

interface UserProfile {
    id: number;
    username: string;
    email: string;
    phone: string;
    address: string;
    role: string;
}

const Profile: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    
    // 编辑状态
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ phone: '', address: '' });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            // 这里我们需要一个获取单个用户详情的接口。
            // 之前的 app.py 只有 admin 才能获取用户列表。
            // 我们可以利用 admin/users 接口如果你是 admin，或者
            // **修改建议**：在 app.py 增加 GET /users/<id> 或者 GET /profile (self)
            
            // 为了不修改太多后端逻辑，我们复用逻辑：
            // 如果后端 app.py 没有 `GET /users/<id>` (非 admin)，我们需要增加一个。
            // 请参考下文补充的后端接口。
            
            // 假设我们已经有了 `GET /users/<id>` (self only or admin)
            // 如果还没加，看下面的补充。
            
            // 暂时 hack: 这里的 user.id 已经在 context 里。
            // 如果后端没写 GET /users/<id>，我们没法回显数据。
            // 这里假设我们在 后端 补充一个 GET /auth/me 或者 GET /users/<id>
            
            // 临时方案：如果是 admin，可以用 /admin/users 过滤。如果是普通用户，
            // 我们需要在后端加一个获取自己信息的接口。
            // 鉴于此，我们在下面的补充代码里加一个 GET /users/<id>
            
            const res = await api.get(`/users/${user?.id}`);
            setProfile(res.data);
            setEditData({
                phone: res.data.phone || '',
                address: res.data.address || ''
            });
        } catch (error) {
            console.error(error);
            alert("无法获取个人信息，请检查后端接口");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/users/${user?.id}`, editData);
            alert("更新成功");
            setIsEditing(false);
            fetchProfile(); // 刷新
        } catch (error) {
            alert("更新失败");
        }
    };

    if (loading) return <Loading />;
    if (!profile) return <div>User not found</div>;

    return (
        <div className="profile-container">
            <h2>个人中心</h2>
            <div className="dashboard-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>{profile.username}</h3>
                    <span className="role-badge">{profile.role}</span>
                </div>
                <p style={{ color: '#666' }}>邮箱: {profile.email}</p>
                <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />

                {isEditing ? (
                    <form onSubmit={handleUpdate}>
                        <div className="form-group">
                            <label>电话:</label>
                            <input 
                                type="text" 
                                value={editData.phone} 
                                onChange={e => setEditData({...editData, phone: e.target.value})} 
                            />
                        </div>
                        <div className="form-group">
                            <label>地址:</label>
                            <input 
                                type="text" 
                                value={editData.address} 
                                onChange={e => setEditData({...editData, address: e.target.value})} 
                            />
                        </div>
                        <div className="action-buttons">
                            <button type="submit" className="btn-action btn-primary">保存</button>
                            <button type="button" onClick={() => setIsEditing(false)} className="btn-action btn-secondary">取消</button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <ul className="dashboard-list">
                            <li><strong>电话:</strong> {profile.phone || '未填写'}</li>
                            <li><strong>地址:</strong> {profile.address || '未填写'}</li>
                        </ul>
                        <button 
                            onClick={() => setIsEditing(true)} 
                            className="btn-action btn-primary" 
                            style={{ marginTop: '20px' }}
                        >
                            修改资料
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;