import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { clearUserData, getCurrentUser, isLoggedIn } from '../../api/user';
import './Admin.css';

const navItems = [
    { to: '/admin', label: '数据总览', end: true },
    { to: '/admin/posts', label: '内容管理' },
    { to: '/admin/compose', label: '运营发帖' },
    { to: '/admin/comments', label: '评论管理' },
    { to: '/admin/reports', label: '举报审核' },
    { to: '/admin/users', label: '用户管理' },
];

const AdminLayout = () => {
    const navigate = useNavigate();
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
                        <div className="admin-brand-title">深汕校园e站</div>
                        <div className="admin-brand-subtitle">运营控制台</div>
                    </div>
                    <nav className="admin-nav">
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} end={item.end}>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <main className="admin-main">
                    <header className="admin-topbar">
                        <h1>后台管理</h1>
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
