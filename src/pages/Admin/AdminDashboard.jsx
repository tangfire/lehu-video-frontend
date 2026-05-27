import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiEdit3, FiFileText, FiFlag, FiMessageCircle, FiStar } from 'react-icons/fi';
import { campusAdminApi } from '../../api/admin';
import { compactNumber, excerpt, postCover, postTypeText } from './adminUtils';
import './Admin.css';

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

    const keyStats = useMemo(() => {
        if (!summary) return [];
        const todayInteraction = Number(summary.today_comments || 0) + Number(summary.today_likes || 0) + Number(summary.today_collections || 0);
        const pending = Number(summary.pending_reports || 0) + Number(summary.pending_posts || 0) + Number(summary.pending_comments || 0);
        return [
            { label: '今日访问', value: summary.today_visits || 0, hint: `累计 ${compactNumber(summary.total_visits)}` },
            { label: '今日登录', value: summary.today_logins || 0, hint: `新增用户 ${compactNumber(summary.today_users)}` },
            { label: '今日互动', value: todayInteraction, hint: '评论 / 点赞 / 收藏' },
            { label: '待处理', value: pending, hint: '举报和待审核内容' },
        ];
    }, [summary]);

    const todos = useMemo(() => {
        if (!summary) return [];
        const items = [];
        if (Number(summary.pending_reports || 0) > 0) {
            items.push({ icon: <FiFlag />, title: '处理举报', detail: `${summary.pending_reports} 条举报等待处理`, to: '/admin/reports?status=0' });
        }
        if (Number(summary.pending_posts || 0) > 0) {
            items.push({ icon: <FiFileText />, title: '审核帖子', detail: `${summary.pending_posts} 篇帖子待审核`, to: '/admin/posts?status=0' });
        }
        if (Number(summary.pending_comments || 0) > 0) {
            items.push({ icon: <FiMessageCircle />, title: '审核评论', detail: `${summary.pending_comments} 条评论待处理`, to: '/admin/comments?status=0' });
        }
        if (Number(summary.today_posts || 0) < 3) {
            items.push({ icon: <FiEdit3 />, title: '补 3 条官方内容', detail: '报到攻略、宿舍 FAQ、问答引导最适合今天发', to: '/admin/compose' });
        }
        return items.length > 0 ? items : [{ icon: <FiStar />, title: '今天状态不错', detail: '没有紧急待办，可以继续准备种子内容', to: '/admin/compose' }];
    }, [summary]);

    if (error) return <div className="admin-error">{error}</div>;
    if (!summary) return <div className="admin-loading">数据加载中...</div>;

    return (
        <div className="admin-dashboard simple">
            <section className="admin-simple-head">
                <div>
                    <span className="admin-kicker">今日运营</span>
                    <h2>先看待办，再发内容</h2>
                    <p>开学前后台只需要盯住内容供给、互动和审核风险。</p>
                </div>
                <div className="admin-head-actions">
                    <Link className="admin-button primary" to="/admin/compose">
                        <FiEdit3 />
                        发官方帖
                    </Link>
                    <Link className="admin-button" to="/admin/posts">
                        内容管理
                    </Link>
                </div>
            </section>

            <section className="admin-key-grid">
                {keyStats.map((item) => (
                    <div className="admin-key-stat" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{compactNumber(item.value)}</strong>
                        <em>{item.hint}</em>
                    </div>
                ))}
            </section>

            <section className="admin-two-column simple">
                <div className="admin-panel">
                    <div className="admin-panel-head">
                        <h2>今天先做这些</h2>
                    </div>
                    <div className="admin-todo-list simple">
                        {todos.map((item) => (
                            <Link className="admin-todo-item" to={item.to} key={item.title}>
                                {item.icon}
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
                        <h2>热门内容</h2>
                        <Link to="/admin/posts">查看全部</Link>
                    </div>
                    <div className="admin-hot-list">
                        {hotPosts.length === 0 && <div className="admin-empty compact">还没有热门内容，先发几条官方攻略暖场。</div>}
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
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AdminDashboard;
