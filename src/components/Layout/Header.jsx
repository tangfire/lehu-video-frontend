import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getCurrentUser, clearUserData, getUserDisplayName } from '../../api/user';
import { FiSearch, FiUpload, FiHome, FiUser, FiSettings, FiLogOut, FiMessageCircle, FiBell, FiMenu, FiX } from 'react-icons/fi';
import { IoSparkles } from 'react-icons/io5';
import './Header.css';

const DEFAULT_AVATAR = '/default-avatar.png';

const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // 检查登录状态
    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('token');
            const user = getCurrentUser();

            if (token && user) {
                setIsLoggedIn(true);
                setUserInfo(user);
            } else {
                setIsLoggedIn(false);
                setUserInfo(null);
            }
        };

        checkAuth();

        // 监听storage变化
        const handleStorageChange = (e) => {
            if (e.key === 'token' || e.key === 'userInfo') {
                checkAuth();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const handleLogout = () => {
        clearUserData();
        setIsLoggedIn(false);
        setUserInfo(null);
        setShowDropdown(false);
        navigate('/login');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    const closeDropdown = () => {
        setShowDropdown(false);
    };

    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = DEFAULT_AVATAR;
    };

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.user-menu')) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <header className="header">
            <div className="header-container">
                {/* Logo */}
                <Link to="/" className="logo">
                    <IoSparkles className="logo-icon" />
                    <span className="logo-text">ShortVideo</span>
                </Link>

                {/* 搜索框 - 桌面端 */}
                <form className="search-box" onSubmit={handleSearch}>
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="搜索视频、用户..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="search-btn">搜索</button>
                </form>

                {/* 导航菜单 - 桌面端 */}
                <nav className={`nav-menu ${showMobileMenu ? 'active' : ''}`}>
                    <button
                        className="mobile-close-btn"
                        onClick={() => setShowMobileMenu(false)}
                    >
                        <FiX />
                    </button>

                    <Link
                        to="/"
                        className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                        onClick={() => setShowMobileMenu(false)}
                    >
                        <FiHome />
                        <span>首页</span>
                    </Link>

                    <Link
                        to="/explore"
                        className="nav-link"
                        onClick={() => setShowMobileMenu(false)}
                    >
                        <FiMessageCircle />
                        <span>发现</span>
                    </Link>

                    {isLoggedIn ? (
                        <>
                            <Link
                                to="/upload"
                                className="nav-link upload-btn"
                                onClick={() => setShowMobileMenu(false)}
                            >
                                <FiUpload />
                                <span>上传</span>
                            </Link>

                            <button className="nav-link notification-btn">
                                <FiBell />
                                <span className="notification-badge">3</span>
                            </button>

                            <div className="user-menu">
                                <button
                                    className="user-avatar-btn"
                                    onClick={toggleDropdown}
                                >
                                    <img
                                        src={userInfo?.avatar || DEFAULT_AVATAR}
                                        alt="用户头像"
                                        className="avatar-img"
                                        onError={handleImageError}
                                    />
                                    <span className="user-name">
                                        {getUserDisplayName(userInfo) || '用户'}
                                    </span>
                                </button>

                                {/* 下拉菜单 */}
                                {showDropdown && (
                                    <div className="dropdown-menu">
                                        <div className="dropdown-header">
                                            <img
                                                src={userInfo?.avatar || DEFAULT_AVATAR}
                                                alt="头像"
                                                className="dropdown-avatar"
                                                onError={handleImageError}
                                            />
                                            <div className="dropdown-user-info">
                                                <strong>{getUserDisplayName(userInfo)}</strong>
                                                <span>@{userInfo?.username || 'user'}</span>
                                            </div>
                                        </div>

                                        <div className="dropdown-divider"></div>

                                        <Link
                                            to={`/user/${userInfo?.id}`}
                                            className="dropdown-item"
                                            onClick={closeDropdown}
                                        >
                                            <FiUser />
                                            <span>个人中心</span>
                                        </Link>

                                        <Link
                                            to="/settings"
                                            className="dropdown-item"
                                            onClick={closeDropdown}
                                        >
                                            <FiSettings />
                                            <span>账号设置</span>
                                        </Link>

                                        <div className="dropdown-divider"></div>

                                        <button
                                            className="dropdown-item logout-btn"
                                            onClick={handleLogout}
                                        >
                                            <FiLogOut />
                                            <span>退出登录</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="auth-buttons">
                            <Link to="/login" className="login-btn">
                                登录
                            </Link>
                            <Link to="/register" className="register-btn">
                                注册
                            </Link>
                        </div>
                    )}
                </nav>

                {/* 移动端菜单按钮 */}
                <button
                    className="mobile-menu-btn"
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                >
                    {showMobileMenu ? <FiX /> : <FiMenu />}
                </button>

                {/* 移动端搜索按钮 */}
                <button className="mobile-search-btn">
                    <FiSearch />
                </button>
            </div>
        </header>
    );
};

export default Header;