import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiEdit3, FiFlag, FiFileText, FiMessageSquare, FiUsers } from 'react-icons/fi';
import { clearUserData, getCurrentUser, isLoggedIn } from '../../api/user';
import './Admin.css';

const navItems = [
    { to: '/admin', label: '数据总览', end: true, icon: <FiBarChart2 /> },
    { to: '/admin/posts', label: '内容工作台', icon: <FiFileText /> },
    { to: '/admin/compose', label: '运营发帖', icon: <FiEdit3 /> },
    { to: '/admin/comments', label: '评论管理', icon: <FiMessageSquare /> },
    { to: '/admin/reports', label: '举报处理', icon: <FiFlag /> },
    { to: '/admin/users', label: '用户管理', icon: <FiUsers /> },
];

const titleMap = {
    '/admin': '数据总览',
    '/admin/posts': '内容工作台',
    '/admin/compose': '运营发帖',
    '/admin/comments': '评论管理',
    '/admin/reports': '举报处理',
    '/admin/users': '用户管理',
};

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();

    if (!isLoggedIn()) {
        return <Navigate to="/admin/login" replace />;
    }

    const logout = () => {
        clearUserData();
        navigate('/admin/login', { replace: true });
    };

    return (
        <div className="admin-shell">
            <div className="admin-layout">
                <aside className="admin-sidebar">
                    <div className="admin-brand">
                        <div className="admin-brand-mark">e</div>
                        <div className="admin-brand-title">深汕校园e站</div>
                        <div className="admin-brand-subtitle">运营控制台</div>
                    </div>
                    <nav className="admin-nav">
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} end={item.end}>
                                {item.icon}
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <main className="admin-main">
                    <header className="admin-topbar">
                        <div>
                            <h1>{titleMap[location.pathname] || '后台管理'}</h1>
                            <p>深汕e仔官方内容、社区秩序和增长数据都在这里处理。</p>
                        </div>
                        <div className="admin-user">
                            <span>{user?.nickname || user?.name || '运营同学'}</span>
                            <button className="admin-button" onClick={logout}>退出</button>
                        </div>
                    </header>
                    <div className="admin-content">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
