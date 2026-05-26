import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi, identifyInputType, saveUserData } from '../../api/user';
import './Register.css';

const Register = () => {
    const [step, setStep] = useState(1); // 1: 输入账号, 2: 输入验证码和密码
    const [formData, setFormData] = useState({
        account: '',
        code: '',
        password: '',
        confirmPassword: '',
        codeId: null // 验证码ID
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [codeLoading, setCodeLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const navigate = useNavigate();

    // 倒计时效果
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const validateAccount = () => {
        const accountType = identifyInputType(formData.account);
        if (!accountType) {
            setErrors({ account: '请输入正确的手机号或邮箱' });
            return false;
        }
        return true;
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.code.trim()) {
            newErrors.code = '验证码不能为空';
        }

        if (formData.password.length < 8) {
            newErrors.password = '密码至少8位';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = '两次密码不一致';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 获取验证码
    const handleGetCode = async () => {
        if (!validateAccount()) return;

        setCodeLoading(true);
        setErrors({});

        try {
            const accountType = identifyInputType(formData.account);
            const requestData = {};

            if (accountType === 'mobile') {
                requestData.mobile = formData.account;
            } else {
                requestData.email = formData.account;
            }

            const response = await userApi.getVerificationCode(requestData);

            // response现在是 { code_id: 3648334586 }
            if (response.code_id) {
                setFormData(prev => ({ ...prev, codeId: response.code_id, code: '888888' }));
                setStep(2); // 切换到第二步
                setCountdown(60); // 60秒倒计时
            } else {
                setErrors({ account: '获取验证码失败，请重试' });
            }
        } catch (error) {
            setErrors({
                account: error.message || '获取验证码失败',
                // 可以显示更详细的错误信息
                ...(error.data && { details: JSON.stringify(error.data) })
            });
        } finally {
            setCodeLoading(false);
        }
    };

    // 注册提交
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setErrors({});

        try {
            const accountType = identifyInputType(formData.account);
            const requestData = {
                password: formData.password,
                code_id: formData.codeId,
                code: formData.code
            };

            if (accountType === 'mobile') {
                requestData.mobile = formData.account;
            } else {
                requestData.email = formData.account;
            }

            const response = await userApi.register(requestData);

            // 如果注册接口也返回token和user（最佳实践）
            if (response.token && response.user) {
                saveUserData(response.token, response.user);
                navigate('/');
            }
            // 如果注册接口只返回user_id（向后兼容）
            else if (response.user_id) {
                // 注册成功后自动登录
                const loginResponse = await userApi.login({
                    [accountType === 'mobile' ? 'mobile' : 'email']: formData.account,
                    password: formData.password
                });

                if (loginResponse.token && loginResponse.user) {
                    saveUserData(loginResponse.token, loginResponse.user);
                    navigate('/');
                } else {
                    setErrors({ submit: '注册成功，但自动登录失败' });
                }
            } else {
                setErrors({ submit: '注册失败，请重试' });
            }
        } catch (error) {
            setErrors({
                submit: error.message || '注册失败，请重试',
                ...(error.data && { details: JSON.stringify(error.data) })
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <h2>创建账号</h2>

                {errors.submit && (
                    <div className="error-message">{errors.submit}</div>
                )}

                {step === 1 ? (
                    // 第一步：输入账号，获取验证码
                    <div className="step-1">
                        <div className="form-group">
                            <label>手机号/邮箱</label>
                            <input
                                type="text"
                                value={formData.account}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    account: e.target.value
                                })}
                                placeholder="请输入手机号或邮箱"
                                disabled={codeLoading}
                            />
                            {errors.account && (
                                <span className="error">{errors.account}</span>
                            )}
                        </div>

                        <button
                            onClick={handleGetCode}
                            className="get-code-btn"
                            disabled={codeLoading || countdown > 0}
                        >
                            {codeLoading ? '发送中...' : countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
                        </button>

                        <div className="login-link">
                            已有账号？ <Link to="/login">立即登录</Link>
                        </div>
                    </div>
                ) : (
                    // 第二步：输入验证码和密码
                    <form onSubmit={handleSubmit} className="step-2">
                        <div className="form-group">
                            <label>手机号/邮箱</label>
                            <div className="account-display">
                                {formData.account}
                                <button
                                    type="button"
                                    className="change-btn"
                                    onClick={() => setStep(1)}
                                    disabled={loading}
                                >
                                    修改
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>验证码</label>
                            <p className="code-helper">本地开发验证码已填入 888888</p>
                            <div className="code-input-group">
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        code: e.target.value
                                    })}
                                    placeholder="请输入验证码"
                                    disabled={loading}
                                    maxLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={handleGetCode}
                                    className="resend-btn"
                                    disabled={codeLoading || countdown > 0 || loading}
                                >
                                    {countdown > 0 ? `${countdown}秒` : '重新发送'}
                                </button>
                            </div>
                            {errors.code && (
                                <span className="error">{errors.code}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>密码</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    password: e.target.value
                                })}
                                placeholder="至少8位密码"
                                disabled={loading}
                            />
                            {errors.password && (
                                <span className="error">{errors.password}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label>确认密码</label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    confirmPassword: e.target.value
                                })}
                                placeholder="再次输入密码"
                                disabled={loading}
                            />
                            {errors.confirmPassword && (
                                <span className="error">{errors.confirmPassword}</span>
                            )}
                        </div>

                        <div className="form-group terms">
                            <input type="checkbox" id="terms" disabled={loading} />
                            <label htmlFor="terms">
                                我已阅读并同意
                                <Link to="/terms">《用户协议》</Link>
                                和
                                <Link to="/privacy">《隐私政策》</Link>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            {loading ? '注册中...' : '完成注册'}
                        </button>

                        <div className="login-link">
                            已有账号？ <Link to="/login">立即登录</Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Register;
