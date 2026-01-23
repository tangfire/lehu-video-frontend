import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { userApi, identifyInputType, saveUserData } from '../../api/user';
import './Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        account: '', // 手机号或邮箱
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // 获取重定向路径
    const from = location.state?.from?.pathname || '/';

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(''); // 清空错误信息
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 验证输入
        if (!formData.account.trim() || !formData.password.trim()) {
            setError('请输入账号和密码');
            return;
        }

        // 判断账号类型
        const accountType = identifyInputType(formData.account);
        if (!accountType) {
            setError('请输入正确的手机号或邮箱');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 构造请求数据
            const requestData = {
                password: formData.password
            };

            // 根据账号类型设置字段
            if (accountType === 'mobile') {
                requestData.mobile = formData.account;
            } else {
                requestData.email = formData.account;
            }

            console.log('登录请求数据:', requestData);

            // 调用登录API
            const response = await userApi.login(requestData);
            console.log('登录响应:', response); // response现在直接是data字段的内容

            // response现在是: { token: "...", user: {...} }
            if (response.token && response.user) {
                console.log('登录成功，用户ID:', response.user.id);

                // 保存token和完整的用户信息
                saveUserData(response.token, response.user);

                // 跳转到之前访问的页面或首页
                navigate(from, { replace: true });
            } else {
                setError('登录失败，服务器返回数据不完整');
            }
        } catch (error) {
            console.error('登录失败:', error);
            setError(error.message || '登录失败，请检查账号和密码');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">登录</h2>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="account">手机号/邮箱</label>
                        <input
                            type="text"
                            id="account"
                            name="account"
                            value={formData.account}
                            onChange={handleChange}
                            required
                            placeholder="请输入手机号或邮箱"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">密码</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="请输入密码"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input type="checkbox" disabled={loading} /> 记住我
                        </label>
                        <Link to="/forgot-password" className="forgot-password">
                            忘记密码？
                        </Link>
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading ? '登录中...' : '登录'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>
                        还没有账号？ <Link to="/register">立即注册</Link>
                    </p>
                    <div className="divider">
                        <span>或使用以下方式登录</span>
                    </div>
                    <div className="social-login">
                        <button className="social-btn wechat" disabled={loading}>微信</button>
                        <button className="social-btn qq" disabled={loading}>QQ</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;