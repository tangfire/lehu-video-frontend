import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight, FiMessageCircle, FiShare2, FiStar, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { campusAdminApi } from '../../api/admin';
import { compactNumber, excerpt, percentText, postCover, postTypeText } from './adminUtils';
import './Admin.css';

const statItems = [
    ['今日访问', 'today_visits'],
    ['今日分享', 'today_shares'],
    ['今日登录', 'today_logins'],
    ['今日新增用户', 'today_users'],
    ['今日发帖', 'today_posts'],
    ['今日评论', 'today_comments'],
    ['今日点赞', 'today_likes'],
    ['今日收藏', 'today_collections'],
];

const totalItems = [
    ['累计用户', 'total_users'],
    ['累计帖子', 'total_posts'],
    ['累计评论', 'total_comments'],
    ['官方内容', 'official_posts'],
    ['精选内容', 'featured_posts'],
    ['待处理举报', 'pending_reports'],
];

const AdminDashboard = () => {
    const [summary, setSummary] = useState(null);
    const [hotPosts, setHotPosts] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;
        Promise.all([
            campusAdminApi.summary(),
            campusAdminApi.listPosts({ sort: 'hot', status: 1, size: 5 }),
        ])
            .then(([summaryData, postsData]) => {
                if (!mounted) return;
                setSummary(summaryData.summary || {});
                setHotPosts(postsData.posts || []);
            })
            .catch((err) => {
                if (mounted) setError(err.message || '获取数据失败');
            });
        return () => {
            mounted = false;
        };
    }, []);

    const insights = useMemo(() => {
        if (!summary) return [];
        const engagement = Number(summary.today_comments || 0) + Number(summary.today_likes || 0) + Number(summary.today_collections || 0);
        const pending = Number(summary.pending_reports || 0) + Number(summary.pending_posts || 0) + Number(summary.pending_comments || 0);
        return [
            { label: '登录转化率', value: percentText(summary.today_logins, summary.today_visits), hint: '今日登录 / 今日访问', icon: <FiUsers /> },
            { label: '互动率', value: percentText(engagement, summary.today_visits), hint: '评论+点赞+收藏 / 访问', icon: <FiMessageCircle /> },
            { label: '分享率', value: percentText(summary.today_shares, summary.today_visits), hint: '今日分享 / 今日访问', icon: <FiShare2 /> },
            { label: '待办数', value: compactNumber(pending), hint: '举报、待审核内容和评论', icon: <FiAlertCircle /> },
        ];
    }, [summary]);

    const todos = useMemo(() => {
        if (!summary) return [];
        const items = [];
        if (Number(summary.pending_reports || 0) > 0) {
            items.push({ title: '处理举报', detail: `${summary.pending_reports} 条举报等待判断`, to: '/admin/reports' });
        }
        if (Number(summary.pending_posts || 0) > 0) {
            items.push({ title: '审核内容', detail: `${summary.pending_posts} 篇帖子待审核`, to: '/admin/posts?status=0' });
        }
        if (Number(summary.pending_comments || 0) > 0) {
            items.push({ title: '审核评论', detail: `${summary.pending_comments} 条评论待审核`, to: '/admin/comments?status=0' });
        }
        if (Number(summary.today_posts || 0) < 3) {
            items.push({ title: '补充今日种子内容', detail: '建议至少发布 3 条官方攻略或问答引导', to: '/admin/compose' });
        }
        return items.length > 0 ? items : [{ title: '今日状态稳定', detail: '暂无紧急处理项，可以继续准备开学内容', to: '/admin/compose' }];
    }, [summary]);

    if (error) return <div className="admin-error">{error}</div>;
    if (!summary) return <div className="admin-loading">数据加载中...</div>;

    return (
        <div className="admin-dashboard">
            <section className="admin-hero">
                <div>
                    <span className="admin-kicker">运营增长工作台</span>
                    <h2>把开学前的内容、互动和待办盯清楚</h2>
                    <p>重点看今日访问、登录转化、分享和官方内容供给，方便你判断推广有没有起量。</p>
                </div>
                <Link className="admin-button primary" to="/admin/compose">
                    发布官方内容
                    <FiArrowRight />
                </Link>
            </section>

            <section className="admin-section">
                <div className="admin-grid compact">
                    {statItems.map(([label, key]) => (
                        <div className="admin-stat" key={key}>
                            <div className="admin-stat-label">{label}</div>
                            <div className="admin-stat-value">{compactNumber(summary[key])}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="admin-section">
                <div className="admin-insight-grid">
                    {insights.map((item) => (
                        <div className="admin-insight-card" key={item.label}>
                            <div className="admin-insight-icon">{item.icon}</div>
                            <div>
                                <div className="admin-stat-label">{item.label}</div>
                                <div className="admin-stat-value small">{item.value}</div>
                                <div className="admin-muted">{item.hint}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="admin-two-column">
                <div className="admin-panel">
                    <div className="admin-panel-head">
                        <h2>今日待办</h2>
                        <Link to="/admin/posts">去内容工作台</Link>
                    </div>
                    <div className="admin-todo-list">
                        {todos.map((item) => (
                            <Link className="admin-todo-item" to={item.to} key={item.title}>
                                <FiAlertCircle />
                                <div>
                                    <strong>{item.title}</strong>
                                    <span>{item.detail}</span>
                                </div>
                                <FiArrowRight />
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="admin-panel">
                    <div className="admin-panel-head">
                        <h2>热门内容 Top 5</h2>
                        <Link to="/admin/posts">管理内容</Link>
                    </div>
                    <div className="admin-hot-list">
                        {hotPosts.length === 0 && <div className="admin-empty">还没有热门内容，先发几条官方攻略暖场。</div>}
                        {hotPosts.map((post, index) => (
                            <div className="admin-hot-item" key={post.id}>
                                <div className="admin-hot-rank">{index + 1}</div>
                                <div className="admin-hot-cover">
                                    {postCover(post) ? <img src={postCover(post)} alt="" /> : <FiStar />}
                                </div>
                                <div className="admin-hot-body">
                                    <strong>{post.title || '未命名内容'}</strong>
                                    <span>{postTypeText(post.post_type)} · {excerpt(post.content, 32)}</span>
                                </div>
                                <div className="admin-hot-metric">
                                    <FiTrendingUp />
                                    {compactNumber((post.like_count || 0) + (post.comment_count || 0) + (post.collected_count || 0))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="admin-two-column">
                <div className="admin-panel">
                    <h2>累计资产</h2>
                    <div className="admin-mini-stat-grid">
                        {totalItems.map(([label, key]) => (
                            <div className="admin-mini-stat" key={key}>
                                <span>{label}</span>
                                <strong>{compactNumber(summary[key])}</strong>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="admin-panel">
                    <h2>最近 7 天趋势</h2>
                    <div className="admin-trend-bars">
                        {(summary.trends || []).map((item) => {
                            const maxVisits = Math.max(...(summary.trends || []).map((trend) => Number(trend.visits || 0)), 1);
                            const width = Math.max(8, Math.round((Number(item.visits || 0) / maxVisits) * 100));
                            return (
                                <div className="admin-trend-row" key={item.date}>
                                    <span>{item.date?.slice(5) || item.date}</span>
                                    <div><i style={{ width: `${width}%` }} /></div>
                                    <strong>{compactNumber(item.visits)}</strong>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AdminDashboard;
