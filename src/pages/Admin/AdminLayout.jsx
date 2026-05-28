import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiBell, FiBookOpen, FiCpu, FiEdit3, FiFlag, FiFileText, FiKey, FiMessageSquare, FiSend, FiShield, FiUsers } from 'react-icons/fi';
import { clearUserData, getCurrentUser, isLoggedIn } from '../../api/user';
import './Admin.css';

const navItems = [
    { to: '/admin', label: '数据总览', end: true, icon: <FiBarChart2 /> },
    { to: '/admin/posts', label: '内容工作台', icon: <FiFileText /> },
    { to: '/admin/compose', label: '运营发帖', icon: <FiEdit3 /> },
    { to: '/admin/notifications', label: '通知中心', icon: <FiBell /> },
    { to: '/admin/ai-replies', label: 'e仔回复', icon: <FiCpu /> },
    { to: '/admin/knowledge', label: 'e仔知识库', icon: <FiBookOpen /> },
    { to: '/admin/comments', label: '评论管理', icon: <FiMessageSquare /> },
    { to: '/admin/reports', label: '举报处理', icon: <FiFlag /> },
    { to: '/admin/feedback', label: '用户反馈', icon: <FiSend /> },
    { to: '/admin/security', label: '安全中心', icon: <FiShield /> },
    { to: '/admin/users', label: '用户管理', icon: <FiUsers /> },
    { to: '/admin/permissions', label: '权限管理', icon: <FiKey /> },
];

const navGroups = [
    { title: '运营增长', items: navItems.slice(0, 6) },
    { title: '内容治理', items: navItems.slice(6, 9) },
    { title: '用户与安全', items: navItems.slice(9) },
];

const titleMap = {
    '/admin': '数据总览',
    '/admin/posts': '内容工作台',
    '/admin/compose': '运营发帖',
    '/admin/notifications': '通知中心',
    '/admin/ai-replies': 'e仔回复',
    '/admin/knowledge': 'e仔知识库',
    '/admin/comments': '评论管理',
    '/admin/reports': '举报处理',
    '/admin/feedback': '用户反馈',
    '/admin/security': '安全中心',
    '/admin/users': '用户管理',
    '/admin/permissions': '权限管理',
};

const subtitleMap = {
    '/admin': '先看待办、流量、互动和风险，再决定今天要发什么内容。',
    '/admin/posts': '管理首页内容流，处理置顶、精选、下架和内容状态。',
    '/admin/compose': '用深汕e仔发布官方攻略、问答和新生内容。',
    '/admin/notifications': '给小程序消息中心发送内测公告、维护提醒和活动通知。',
    '/admin/ai-replies': '查看 @深汕e仔 自动回复链路是否启用、是否失败，并手动重试。',
    '/admin/knowledge': '维护 e仔回答校园问题时可引用的资料，上传文档、录入信息并测试命中效果。',
    '/admin/comments': '处理评论可见性，查看评论来源和关联原帖。',
    '/admin/reports': '按举报对象处理内容风险，必要时下架帖子或评论。',
    '/admin/feedback': '收集用户建议和问题反馈，标记跟进状态。',
    '/admin/security': '查看请求、限流、异常 IP 和接口访问情况。',
    '/admin/users': '查看用户画像、活跃、内容贡献和风险记录。',
    '/admin/permissions': '集中分配运营和管理员权限，避免在用户管理里误操作。',
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
                        {navGroups.map((group) => (
                            <div className="admin-nav-group" key={group.title}>
                                <span className="admin-nav-group-title">{group.title}</span>
                                {group.items.map((item) => (
                                    <NavLink key={item.to} to={item.to} end={item.end}>
                                        {item.icon}
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        ))}
                    </nav>
                </aside>
                <main className="admin-main">
                    <header className="admin-topbar">
                        <div>
                            <h1>{titleMap[location.pathname] || '后台管理'}</h1>
                            <p>{subtitleMap[location.pathname] || '深汕e仔官方内容、社区秩序和增长数据都在这里处理。'}</p>
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
