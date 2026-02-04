import React, { useState, useEffect } from 'react';
import { userApi, getCurrentUser, updateLocalUserInfo } from '../../api/user';
import './Settings.css';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [currentUser, setCurrentUser] = useState(null);

    // 用户信息表单
    const [profileForm, setProfileForm] = useState({
        name: '',
        nickname: '',
        gender: 0,
        signature: '',
        avatar: '',
        background_image: ''
    });

    // 凭证绑定
    const [voucherForm, setVoucherForm] = useState({
        phone: '',
        email: '',
        phoneCode: '',
        emailCode: ''
    });

    // 安全设置
    const [securityForm, setSecurityForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // 获取当前用户信息
    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
            setProfileForm({
                name: user.name || '',
                nickname: user.nickname || '',
                gender: user.gender || 0,
                signature: user.signature || '',
                avatar: user.avatar || '',
                background_image: user.background_image || ''
            });
        }
    }, []);

    // 保存个人信息
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            setSaving(true);
            setMessage({ type: '', text: '' });

            const response = await userApi.updateUserInfo({
                user_id: currentUser.id,
                ...profileForm
            });

            console.log('更新用户信息响应:', response);

            // 更新本地存储的用户信息
            const updatedUser = updateLocalUserInfo(profileForm);
            setCurrentUser(updatedUser);

            setMessage({
                type: 'success',
                text: '个人信息更新成功！'
            });

            // 3秒后清除消息
            setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 3000);
        } catch (error) {
            console.error('更新个人信息失败:', error);
            setMessage({
                type: 'error',
                text: `更新失败: ${error.message || '未知错误'}`
            });
        } finally {
            setSaving(false);
        }
    };

    // 处理头像上传
    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: '请选择图片文件' });
            return;
        }

        // 验证文件大小 (最大5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: '图片大小不能超过5MB' });
            return;
        }

        try {
            setLoading(true);
            setMessage({ type: '', text: '' });

            // 这里应该调用文件上传接口
            // 暂时模拟上传成功
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target.result;
                setProfileForm(prev => ({ ...prev, avatar: imageUrl }));

                setMessage({
                    type: 'success',
                    text: '头像上传成功！请点击保存更新信息。'
                });
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('上传头像失败:', error);
            setMessage({ type: 'error', text: '上传头像失败' });
        } finally {
            setLoading(false);
        }
    };

    // 处理背景图上传
    const handleBackgroundUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: '请选择图片文件' });
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setMessage({ type: 'error', text: '图片大小不能超过10MB' });
            return;
        }

        try {
            setLoading(true);
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target.result;
                setProfileForm(prev => ({ ...prev, background_image: imageUrl }));
                setMessage({ type: 'success', text: '背景图上传成功！请点击保存更新信息。' });
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('上传背景图失败:', error);
            setMessage({ type: 'error', text: '上传背景图失败' });
        } finally {
            setLoading(false);
        }
    };

    // 绑定手机号
    const handleBindPhone = async () => {
        if (!voucherForm.phone || !voucherForm.phoneCode) {
            setMessage({ type: 'error', text: '请输入手机号和验证码' });
            return;
        }

        try {
            setSaving(true);
            await userApi.bindUserVoucher({
                voucher_type: 0, // PHONE
                voucher: voucherForm.phone
            });

            setMessage({ type: 'success', text: '手机号绑定成功！' });
            setVoucherForm(prev => ({ ...prev, phone: '', phoneCode: '' }));
        } catch (error) {
            console.error('绑定手机号失败:', error);
            setMessage({ type: 'error', text: `绑定失败: ${error.message}` });
        } finally {
            setSaving(false);
        }
    };

    // 绑定邮箱
    const handleBindEmail = async () => {
        if (!voucherForm.email || !voucherForm.emailCode) {
            setMessage({ type: 'error', text: '请输入邮箱和验证码' });
            return;
        }

        try {
            setSaving(true);
            await userApi.bindUserVoucher({
                voucher_type: 1, // EMAIL
                voucher: voucherForm.email
            });

            setMessage({ type: 'success', text: '邮箱绑定成功！' });
            setVoucherForm(prev => ({ ...prev, email: '', emailCode: '' }));
        } catch (error) {
            console.error('绑定邮箱失败:', error);
            setMessage({ type: 'error', text: `绑定失败: ${error.message}` });
        } finally {
            setSaving(false);
        }
    };

    // 获取验证码
    const handleGetCode = (type) => {
        // 这里应该调用获取验证码的API
        alert(`验证码已发送到您的${type === 'phone' ? '手机' : '邮箱'}（演示功能）`);
    };

    // 修改密码
    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (securityForm.newPassword !== securityForm.confirmPassword) {
            setMessage({ type: 'error', text: '两次输入的密码不一致' });
            return;
        }

        if (securityForm.newPassword.length < 6) {
            setMessage({ type: 'error', text: '密码长度至少6位' });
            return;
        }

        // 这里应该调用修改密码的API
        setMessage({ type: 'success', text: '密码修改成功！（演示功能）' });
        setSecurityForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
    };

    const tabs = [
        { id: 'profile', label: '个人信息', icon: '👤' },
        { id: 'voucher', label: '账号绑定', icon: '🔗' },
        { id: 'security', label: '安全设置', icon: '🔒' },
        { id: 'notification', label: '通知设置', icon: '🔔' },
        { id: 'privacy', label: '隐私设置', icon: '👁️' }
    ];

    if (!currentUser) {
        return (
            <div className="settings-loading">
                <div className="loading-spinner"></div>
                <p>加载用户信息中...</p>
            </div>
        );
    }

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>账号设置</h1>
                <p className="settings-subtitle">管理你的账户信息和隐私设置</p>
            </div>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="settings-content">
                <div className="settings-sidebar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="settings-main">
                    {/* 个人信息设置 */}
                    {activeTab === 'profile' && (
                        <div className="settings-section">
                            <h2>个人信息</h2>
                            <form onSubmit={handleSaveProfile}>
                                <div className="form-group">
                                    <label>用户名</label>
                                    <input
                                        type="text"
                                        value={profileForm.name}
                                        onChange={(e) => setProfileForm(prev => ({
                                            ...prev,
                                            name: e.target.value
                                        }))}
                                        placeholder="请输入用户名"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>昵称</label>
                                    <input
                                        type="text"
                                        value={profileForm.nickname}
                                        onChange={(e) => setProfileForm(prev => ({
                                            ...prev,
                                            nickname: e.target.value
                                        }))}
                                        placeholder="请输入昵称"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>性别</label>
                                    <div className="gender-options">
                                        <label className="gender-option">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value="0"
                                                checked={profileForm.gender === 0}
                                                onChange={(e) => setProfileForm(prev => ({
                                                    ...prev,
                                                    gender: parseInt(e.target.value)
                                                }))}
                                            />
                                            <span>保密</span>
                                        </label>
                                        <label className="gender-option">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value="1"
                                                checked={profileForm.gender === 1}
                                                onChange={(e) => setProfileForm(prev => ({
                                                    ...prev,
                                                    gender: parseInt(e.target.value)
                                                }))}
                                            />
                                            <span>男</span>
                                        </label>
                                        <label className="gender-option">
                                            <input
                                                type="radio"
                                                name="gender"
                                                value="2"
                                                checked={profileForm.gender === 2}
                                                onChange={(e) => setProfileForm(prev => ({
                                                    ...prev,
                                                    gender: parseInt(e.target.value)
                                                }))}
                                            />
                                            <span>女</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>个性签名</label>
                                    <textarea
                                        value={profileForm.signature}
                                        onChange={(e) => setProfileForm(prev => ({
                                            ...prev,
                                            signature: e.target.value
                                        }))}
                                        placeholder="介绍一下自己吧～"
                                        rows="3"
                                        maxLength="200"
                                    />
                                    <div className="char-count">
                                        {profileForm.signature.length}/200
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>头像</label>
                                    <div className="avatar-upload">
                                        <img
                                            src={profileForm.avatar || '/default-avatar.png'}
                                            alt="头像预览"
                                            className="avatar-preview"
                                        />
                                        <div className="upload-controls">
                                            <input
                                                type="file"
                                                id="avatar-upload"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                                style={{ display: 'none' }}
                                            />
                                            <label htmlFor="avatar-upload" className="upload-btn">
                                                上传头像
                                            </label>
                                            <p className="upload-hint">支持 JPG、PNG 格式，大小不超过 5MB</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>个人主页背景图</label>
                                    <div className="background-upload">
                                        <div
                                            className="background-preview"
                                            style={{
                                                backgroundImage: `url(${profileForm.background_image || '/default-background.jpg'})`
                                            }}
                                        />
                                        <div className="upload-controls">
                                            <input
                                                type="file"
                                                id="background-upload"
                                                accept="image/*"
                                                onChange={handleBackgroundUpload}
                                                style={{ display: 'none' }}
                                            />
                                            <label htmlFor="background-upload" className="upload-btn">
                                                上传背景图
                                            </label>
                                            <p className="upload-hint">支持 JPG、PNG 格式，大小不超过 10MB</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="save-btn"
                                    disabled={saving}
                                >
                                    {saving ? '保存中...' : '保存设置'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 账号绑定设置 */}
                    {activeTab === 'voucher' && (
                        <div className="settings-section">
                            <h2>账号绑定</h2>

                            <div className="voucher-section">
                                <h3>手机号绑定</h3>
                                <div className="form-row">
                                    <input
                                        type="text"
                                        placeholder="请输入手机号"
                                        value={voucherForm.phone}
                                        onChange={(e) => setVoucherForm(prev => ({
                                            ...prev,
                                            phone: e.target.value
                                        }))}
                                        className="voucher-input"
                                    />
                                    <input
                                        type="text"
                                        placeholder="验证码"
                                        value={voucherForm.phoneCode}
                                        onChange={(e) => setVoucherForm(prev => ({
                                            ...prev,
                                            phoneCode: e.target.value
                                        }))}
                                        className="code-input"
                                        maxLength="6"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleGetCode('phone')}
                                        className="get-code-btn"
                                    >
                                        获取验证码
                                    </button>
                                </div>
                                <button
                                    onClick={handleBindPhone}
                                    className="bind-btn"
                                    disabled={saving}
                                >
                                    {saving ? '绑定中...' : '绑定手机号'}
                                </button>
                            </div>

                            <div className="voucher-section">
                                <h3>邮箱绑定</h3>
                                <div className="form-row">
                                    <input
                                        type="email"
                                        placeholder="请输入邮箱"
                                        value={voucherForm.email}
                                        onChange={(e) => setVoucherForm(prev => ({
                                            ...prev,
                                            email: e.target.value
                                        }))}
                                        className="voucher-input"
                                    />
                                    <input
                                        type="text"
                                        placeholder="验证码"
                                        value={voucherForm.emailCode}
                                        onChange={(e) => setVoucherForm(prev => ({
                                            ...prev,
                                            emailCode: e.target.value
                                        }))}
                                        className="code-input"
                                        maxLength="6"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleGetCode('email')}
                                        className="get-code-btn"
                                    >
                                        获取验证码
                                    </button>
                                </div>
                                <button
                                    onClick={handleBindEmail}
                                    className="bind-btn"
                                    disabled={saving}
                                >
                                    {saving ? '绑定中...' : '绑定邮箱'}
                                </button>
                            </div>

                            <div className="current-bindings">
                                <h3>当前绑定状态</h3>
                                <div className="binding-item">
                                    <span className="binding-label">手机号：</span>
                                    <span className="binding-value">
                    {currentUser.mobile ?
                        `${currentUser.mobile.substring(0, 3)}****${currentUser.mobile.substring(7)}` :
                        '未绑定'}
                  </span>
                                </div>
                                <div className="binding-item">
                                    <span className="binding-label">邮箱：</span>
                                    <span className="binding-value">
                    {currentUser.email ?
                        currentUser.email.replace(/(.{3}).*@/, '$1****@') :
                        '未绑定'}
                  </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 安全设置 */}
                    {activeTab === 'security' && (
                        <div className="settings-section">
                            <h2>安全设置</h2>

                            <form onSubmit={handleChangePassword}>
                                <div className="form-group">
                                    <label>当前密码</label>
                                    <input
                                        type="password"
                                        value={securityForm.currentPassword}
                                        onChange={(e) => setSecurityForm(prev => ({
                                            ...prev,
                                            currentPassword: e.target.value
                                        }))}
                                        placeholder="请输入当前密码"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>新密码</label>
                                    <input
                                        type="password"
                                        value={securityForm.newPassword}
                                        onChange={(e) => setSecurityForm(prev => ({
                                            ...prev,
                                            newPassword: e.target.value
                                        }))}
                                        placeholder="请输入新密码（至少6位）"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>确认新密码</label>
                                    <input
                                        type="password"
                                        value={securityForm.confirmPassword}
                                        onChange={(e) => setSecurityForm(prev => ({
                                            ...prev,
                                            confirmPassword: e.target.value
                                        }))}
                                        placeholder="请再次输入新密码"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="save-btn"
                                >
                                    修改密码
                                </button>
                            </form>

                            <div className="security-actions">
                                <button className="security-btn logout-btn">
                                    退出所有设备登录
                                </button>
                                <button className="security-btn delete-btn">
                                    注销账号
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 通知设置 */}
                    {activeTab === 'notification' && (
                        <div className="settings-section">
                            <h2>通知设置</h2>

                            <div className="notification-item">
                                <div className="notification-info">
                                    <h4>好友申请通知</h4>
                                    <p>有人申请加你为好友时通知</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="notification-item">
                                <div className="notification-info">
                                    <h4>私信通知</h4>
                                    <p>收到新私信时通知</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="notification-item">
                                <div className="notification-info">
                                    <h4>评论通知</h4>
                                    <p>有人评论你的视频时通知</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="notification-item">
                                <div className="notification-info">
                                    <h4>点赞通知</h4>
                                    <p>有人点赞你的视频时通知</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* 隐私设置 */}
                    {activeTab === 'privacy' && (
                        <div className="settings-section">
                            <h2>隐私设置</h2>

                            <div className="privacy-item">
                                <div className="privacy-info">
                                    <h4>私密账号</h4>
                                    <p>开启后，只有你批准的用户才能关注你并查看你的内容</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="privacy-item">
                                <div className="privacy-info">
                                    <h4>隐藏在线状态</h4>
                                    <p>开启后，其他用户将无法看到你的在线状态</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="privacy-item">
                                <div className="privacy-info">
                                    <h4>允许陌生人私信</h4>
                                    <p>关闭后，只有互相关注的用户才能给你发私信</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="privacy-item">
                                <div className="privacy-info">
                                    <h4>展示位置信息</h4>
                                    <p>在发布内容时是否包含位置信息</p>
                                </div>
                                <label className="switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
