import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi, VoucherType, getVoucherTypeText, updateLocalUserInfo, getCurrentUser } from '../../api/user';
import './Settings.css';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const navigate = useNavigate();

    // 个人信息表单
    const [profileForm, setProfileForm] = useState({
        name: '',
        avatar: '',
        background_image: '',
        signature: ''
    });

    // 绑定凭证表单
    const [bindForm, setBindForm] = useState({
        voucher_type: VoucherType.PHONE,
        voucher: ''
    });

    // 解绑凭证表单
    const [unbindForm, setUnbindForm] = useState({
        voucher_type: VoucherType.PHONE
    });

    // 获取用户信息
    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        try {
            // 先检查是否有token
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('没有token，跳转到登录页');
                navigate('/login');
                return;
            }

            // 从本地存储获取用户信息
            const currentUser = getCurrentUser();
            console.log('当前用户信息:', currentUser);

            if (!currentUser?.id) {
                setMessage({ type: 'error', text: '用户信息错误，请重新登录' });
                return;
            }

            // 从API获取最新的用户信息（确保数据最新）
            try {
                const response = await userApi.getUserInfo(currentUser.id);
                console.log('获取用户信息响应:', response);

                if (response.user) {
                    setUserInfo(response.user);
                    setProfileForm({
                        name: response.user.name || '',
                        avatar: response.user.avatar || '',
                        background_image: response.user.background_image || '',
                        signature: response.user.signature || ''
                    });

                    // 同时更新本地存储的用户信息
                    updateLocalUserInfo(response.user);
                }
            } catch (apiError) {
                console.warn('API获取用户信息失败，使用本地信息:', apiError);
                // 如果API调用失败，使用本地存储的信息
                setUserInfo(currentUser);
                setProfileForm({
                    name: currentUser.name || '',
                    avatar: currentUser.avatar || '',
                    background_image: currentUser.background_image || '',
                    signature: currentUser.signature || ''
                });
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            setMessage({ type: 'error', text: '获取用户信息失败' });
        }
    };

    // 更新个人信息
    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        if (!userInfo?.id) {
            setMessage({ type: 'error', text: '用户信息错误' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const data = {
                user_id: userInfo.id,
                ...profileForm
            };

            await userApi.updateUserInfo(data);

            // 更新本地存储的用户信息
            updateLocalUserInfo(profileForm);

            setMessage({ type: 'success', text: '个人信息更新成功' });
            fetchUserInfo(); // 重新获取最新的用户信息
        } catch (error) {
            console.error('更新个人信息失败:', error);
            setMessage({ type: 'error', text: error.message || '更新失败' });
        } finally {
            setLoading(false);
        }
    };

    // 绑定凭证
    const handleBindSubmit = async (e) => {
        e.preventDefault();

        if (!bindForm.voucher.trim()) {
            setMessage({ type: 'error', text: '请输入要绑定的凭证' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await userApi.bindUserVoucher(bindForm);
            setMessage({
                type: 'success',
                text: `${getVoucherTypeText(bindForm.voucher_type)}绑定成功`
            });
            setBindForm({ voucher_type: VoucherType.PHONE, voucher: '' });
            fetchUserInfo(); // 重新获取用户信息
        } catch (error) {
            console.error('绑定凭证失败:', error);
            setMessage({ type: 'error', text: error.message || '绑定失败' });
        } finally {
            setLoading(false);
        }
    };

    // 解绑凭证
    const handleUnbindSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await userApi.unbindUserVoucher(unbindForm);
            setMessage({
                type: 'success',
                text: `${getVoucherTypeText(unbindForm.voucher_type)}解绑成功`
            });
            fetchUserInfo(); // 重新获取用户信息
        } catch (error) {
            console.error('解绑凭证失败:', error);
            setMessage({ type: 'error', text: error.message || '解绑失败' });
        } finally {
            setLoading(false);
        }
    };

    if (!userInfo) {
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
                <p>管理你的账号信息和安全设置</p>
            </div>

            <div className="settings-content">
                {/* 侧边栏导航 */}
                <div className="settings-sidebar">
                    <button
                        className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        📝 个人信息
                    </button>
                    <button
                        className={`sidebar-item ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        🔒 账号安全
                    </button>
                    <button
                        className={`sidebar-item ${activeTab === 'voucher' ? 'active' : ''}`}
                        onClick={() => setActiveTab('voucher')}
                    >
                        📱 凭证管理
                    </button>
                </div>

                {/* 主内容区域 */}
                <div className="settings-main">
                    {/* 消息提示 */}
                    {message.text && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* 个人信息设置 */}
                    {activeTab === 'profile' && (
                        <div className="settings-section">
                            <h2>个人信息</h2>
                            <form onSubmit={handleProfileSubmit} className="settings-form">
                                <div className="form-group">
                                    <label>昵称</label>
                                    <input
                                        type="text"
                                        value={profileForm.name}
                                        onChange={(e) => setProfileForm({
                                            ...profileForm,
                                            name: e.target.value
                                        })}
                                        placeholder="请输入昵称"
                                        maxLength={50}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>个人简介</label>
                                    <textarea
                                        value={profileForm.signature}
                                        onChange={(e) => setProfileForm({
                                            ...profileForm,
                                            signature: e.target.value
                                        })}
                                        placeholder="介绍一下自己吧..."
                                        maxLength={200}
                                        rows={3}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>头像URL</label>
                                    <input
                                        type="text"
                                        value={profileForm.avatar}
                                        onChange={(e) => setProfileForm({
                                            ...profileForm,
                                            avatar: e.target.value
                                        })}
                                        placeholder="请输入头像图片链接"
                                        disabled={loading}
                                    />
                                    {profileForm.avatar && (
                                        <div className="avatar-preview">
                                            <img src={profileForm.avatar} alt="头像预览" />
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>背景图URL</label>
                                    <input
                                        type="text"
                                        value={profileForm.background_image}
                                        onChange={(e) => setProfileForm({
                                            ...profileForm,
                                            background_image: e.target.value
                                        })}
                                        placeholder="请输入背景图片链接"
                                        disabled={loading}
                                    />
                                    {profileForm.background_image && (
                                        <div className="background-preview">
                                            <img src={profileForm.background_image} alt="背景预览" />
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={loading}
                                >
                                    {loading ? '保存中...' : '保存更改'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* 账号安全设置 */}
                    {activeTab === 'security' && (
                        <div className="settings-section">
                            <h2>账号安全</h2>

                            <div className="security-item">
                                <div className="security-info">
                                    <h3>修改密码</h3>
                                    <p>定期修改密码有助于保护账号安全</p>
                                </div>
                                <button className="action-btn">修改密码</button>
                            </div>

                            <div className="security-item">
                                <div className="security-info">
                                    <h3>登录设备</h3>
                                    <p>查看和管理已登录的设备</p>
                                </div>
                                <button className="action-btn">查看设备</button>
                            </div>

                            <div className="security-item">
                                <div className="security-info">
                                    <h3>登录记录</h3>
                                    <p>查看最近的登录活动</p>
                                </div>
                                <button className="action-btn">查看记录</button>
                            </div>
                        </div>
                    )}

                    {/* 凭证管理设置 */}
                    {activeTab === 'voucher' && (
                        <div className="settings-section">
                            <h2>凭证管理</h2>

                            {/* 当前凭证状态 */}
                            <div className="current-vouchers">
                                <h3>当前绑定状态</h3>
                                <div className="voucher-status">
                                    <div className="status-item">
                                        <span className="label">手机号:</span>
                                        <span className="value">
                      {userInfo.mobile || '未绑定'}
                                            {userInfo.mobile && <span className="verified">✓ 已验证</span>}
                    </span>
                                    </div>
                                    <div className="status-item">
                                        <span className="label">邮箱:</span>
                                        <span className="value">
                      {userInfo.email || '未绑定'}
                                            {userInfo.email && <span className="verified">✓ 已验证</span>}
                    </span>
                                    </div>
                                </div>
                            </div>

                            {/* 绑定凭证 */}
                            <div className="bind-voucher">
                                <h3>绑定新凭证</h3>
                                <form onSubmit={handleBindSubmit} className="settings-form">
                                    <div className="form-group">
                                        <label>凭证类型</label>
                                        <select
                                            value={bindForm.voucher_type}
                                            onChange={(e) => setBindForm({
                                                ...bindForm,
                                                voucher_type: parseInt(e.target.value)
                                            })}
                                            disabled={loading}
                                        >
                                            <option value={VoucherType.PHONE}>手机号</option>
                                            <option value={VoucherType.EMAIL}>邮箱</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>
                                            {bindForm.voucher_type === VoucherType.PHONE ? '手机号' : '邮箱地址'}
                                        </label>
                                        <input
                                            type={bindForm.voucher_type === VoucherType.PHONE ? 'tel' : 'email'}
                                            value={bindForm.voucher}
                                            onChange={(e) => setBindForm({
                                                ...bindForm,
                                                voucher: e.target.value
                                            })}
                                            placeholder={
                                                bindForm.voucher_type === VoucherType.PHONE
                                                    ? '请输入手机号'
                                                    : '请输入邮箱地址'
                                            }
                                            disabled={loading}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="submit-btn"
                                        disabled={loading}
                                    >
                                        {loading ? '绑定中...' : '绑定'}
                                    </button>
                                </form>
                            </div>

                            {/* 解绑凭证 */}
                            <div className="unbind-voucher">
                                <h3>解绑凭证</h3>
                                <form onSubmit={handleUnbindSubmit} className="settings-form">
                                    <div className="form-group">
                                        <label>选择要解绑的凭证类型</label>
                                        <select
                                            value={unbindForm.voucher_type}
                                            onChange={(e) => setUnbindForm({
                                                ...unbindForm,
                                                voucher_type: parseInt(e.target.value)
                                            })}
                                            disabled={loading}
                                        >
                                            {userInfo.mobile && <option value={VoucherType.PHONE}>手机号</option>}
                                            {userInfo.email && <option value={VoucherType.EMAIL}>邮箱</option>}
                                            {!userInfo.mobile && !userInfo.email && (
                                                <option value="">无可用凭证</option>
                                            )}
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        className="submit-btn danger"
                                        disabled={loading || (!userInfo.mobile && !userInfo.email)}
                                    >
                                        {loading ? '解绑中...' : '解绑'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;