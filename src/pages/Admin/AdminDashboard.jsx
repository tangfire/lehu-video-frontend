import { useEffect, useState } from 'react';
import { campusAdminApi } from '../../api/admin';
import './Admin.css';

const statItems = [
    ['今日访问', 'today_visits'],
    ['累计访问', 'total_visits'],
    ['今日分享', 'today_shares'],
    ['累计分享', 'total_shares'],
    ['今日登录', 'today_logins'],
    ['今日新增用户', 'today_users'],
    ['累计用户', 'total_users'],
    ['今日发帖', 'today_posts'],
    ['累计帖子', 'total_posts'],
    ['今日评论', 'today_comments'],
    ['待处理举报', 'pending_reports'],
    ['精选内容', 'featured_posts'],
    ['官方内容', 'official_posts'],
];

const AdminDashboard = () => {
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        campusAdminApi.summary()
            .then((data) => setSummary(data.summary || {}))
            .catch((err) => setError(err.message || '获取数据失败'));
    }, []);

    if (error) return <div className="admin-error">{error}</div>;
    if (!summary) return <div className="admin-muted">加载中...</div>;

    return (
        <>
            <section className="admin-section">
                <div className="admin-grid">
                    {statItems.map(([label, key]) => (
                        <div className="admin-stat" key={key}>
                            <div className="admin-stat-label">{label}</div>
                            <div className="admin-stat-value">{summary[key] || 0}</div>
                        </div>
                    ))}
                </div>
            </section>
            <section className="admin-panel">
                <h2>最近 7 天趋势</h2>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>访问</th>
                                <th>分享</th>
                                <th>登录</th>
                                <th>用户</th>
                                <th>帖子</th>
                                <th>评论</th>
                                <th>点赞</th>
                                <th>收藏</th>
                                <th>举报</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(summary.trends || []).map((item) => (
                                <tr key={item.date}>
                                    <td>{item.date}</td>
                                    <td>{item.visits}</td>
                                    <td>{item.shares}</td>
                                    <td>{item.logins}</td>
                                    <td>{item.users}</td>
                                    <td>{item.posts}</td>
                                    <td>{item.comments}</td>
                                    <td>{item.likes}</td>
                                    <td>{item.collections}</td>
                                    <td>{item.reports}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
};

export default AdminDashboard;
