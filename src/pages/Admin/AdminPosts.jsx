import { useEffect, useState } from 'react';
import { campusAdminApi } from '../../api/admin';
import { mediaTypeText, postTypeText, statusText } from './adminUtils';
import './Admin.css';

const AdminPosts = () => {
    const [posts, setPosts] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('-1');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const load = async (nextPage = page) => {
        setLoading(true);
        setError('');
        try {
            const data = await campusAdminApi.listPosts({
                page: nextPage,
                size: 20,
                keyword,
                status,
            });
            setPosts(data.posts || []);
            setTotal(data.page_stats?.total || 0);
            setPage(nextPage);
        } catch (err) {
            setError(err.message || '获取内容失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updatePost = async (post, patch) => {
        await campusAdminApi.updatePost(post.id, {
            category_code: post.category_code,
            title: post.title,
            content: post.content,
            images: post.images || [],
            media_type: post.media_type,
            post_type: post.post_type,
            extra: post.extra || {},
            cover_url: post.cover_url,
            video_url: post.video_url,
            status: post.status,
            audit_reason: post.audit_reason || '',
            is_official: post.is_official,
            is_featured: post.is_featured,
            sort_weight: post.sort_weight || 0,
            ...patch,
        });
        load(page);
    };

    const deletePost = async (post) => {
        if (!window.confirm(`确认下架/删除「${post.title}」吗？`)) return;
        await campusAdminApi.deletePost(post.id);
        load(page);
    };

    return (
        <>
            <div className="admin-toolbar">
                <input className="admin-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索标题/正文" />
                <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="-1">全部状态</option>
                    <option value="1">可见</option>
                    <option value="0">待审核</option>
                    <option value="2">已拒绝</option>
                    <option value="3">已删除</option>
                </select>
                <button className="admin-button primary" onClick={() => load(1)} disabled={loading}>查询</button>
            </div>
            {error && <div className="admin-error">{error}</div>}
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>内容</th>
                            <th>类型</th>
                            <th>运营</th>
                            <th>互动</th>
                            <th>状态</th>
                            <th>时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.map((post) => (
                            <tr key={post.id}>
                                <td className="admin-title-cell">
                                    <strong>{post.title}</strong>
                                    <div className="admin-muted">{post.content}</div>
                                </td>
                                <td>
                                    <div>{postTypeText(post.post_type)}</div>
                                    <div className="admin-muted">{mediaTypeText(post.media_type)} · {post.category_name || post.category_code}</div>
                                </td>
                                <td>
                                    {post.is_official && <span className="admin-tag">官方</span>}{' '}
                                    {post.is_featured && <span className="admin-tag warn">精选</span>}
                                    <div className="admin-muted">权重 {post.sort_weight || 0}</div>
                                </td>
                                <td>{post.like_count || 0} 赞 · {post.comment_count || 0} 评 · {post.collected_count || 0} 藏</td>
                                <td>{statusText(post.status)}</td>
                                <td>{post.created_at}</td>
                                <td>
                                    <div className="admin-actions">
                                        <button className="admin-button" onClick={() => updatePost(post, { is_featured: !post.is_featured })}>
                                            {post.is_featured ? '取消精选' : '设精选'}
                                        </button>
                                        <button className="admin-button" onClick={() => updatePost(post, { is_official: !post.is_official })}>
                                            {post.is_official ? '取消官方' : '设官方'}
                                        </button>
                                        <button className="admin-button" onClick={() => updatePost(post, { status: 1 })}>通过</button>
                                        <button className="admin-button danger" onClick={() => deletePost(post)}>删除</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="admin-pagination">
                <span className="admin-muted">共 {total} 条</span>
                <button className="admin-button" disabled={page <= 1} onClick={() => load(page - 1)}>上一页</button>
                <button className="admin-button" disabled={page * 20 >= total} onClick={() => load(page + 1)}>下一页</button>
            </div>
        </>
    );
};

export default AdminPosts;
