import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiMessageCircle, FiTrash2 } from 'react-icons/fi';
import { campusAdminApi } from '../../api/admin';
import { statusText } from './adminUtils';
import './Admin.css';

const AdminComments = () => {
    const [searchParams] = useSearchParams();
    const statusParam = searchParams.get('status') || '-1';
    const [comments, setComments] = useState([]);
    const [status, setStatus] = useState(statusParam);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const load = async (nextPage = page, nextStatus = status) => {
        setLoading(true);
        setError('');
        try {
            const data = await campusAdminApi.listComments({ page: nextPage, size: 20, status: nextStatus });
            setComments(data.comments || []);
            setTotal(data.page_stats?.total || 0);
            setPage(nextPage);
        } catch (err) {
            setError(err.message || '获取评论失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setStatus(statusParam);
        load(1, statusParam);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusParam]);

    const showMessage = (text) => {
        setMessage(text);
        window.setTimeout(() => setMessage(''), 2400);
    };

    const remove = async () => {
        if (!pendingDelete) return;
        try {
            await campusAdminApi.deleteComment(pendingDelete.id);
            setPendingDelete(null);
            showMessage('评论已删除');
            load(page);
        } catch (err) {
            setError(err.message || '删除评论失败');
        }
    };

    return (
        <>
            {message && <div className="admin-toast success">{message}</div>}
            <div className="admin-toolbar">
                <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="-1">全部状态</option>
                    <option value="1">可见</option>
                    <option value="0">待审核</option>
                    <option value="2">已拒绝</option>
                    <option value="3">已删除</option>
                </select>
                <button className="admin-button primary" onClick={() => load(1)}>查询</button>
            </div>
            {error && <div className="admin-error">{error}</div>}
            {loading && <div className="admin-loading">评论加载中...</div>}
            {!loading && comments.length === 0 && (
                <div className="admin-empty">
                    <FiMessageCircle />
                    <span>暂无评论数据</span>
                </div>
            )}
            {!loading && comments.length > 0 && <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>评论</th>
                            <th>关联帖子</th>
                            <th>用户</th>
                            <th>状态</th>
                            <th>时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {comments.map((comment) => (
                            <tr key={comment.id}>
                                <td className="admin-title-cell">{comment.content}</td>
                                <td>{comment.post?.title || comment.post_id}</td>
                                <td>{comment.author?.name || comment.author?.nickname || '同学'}</td>
                                <td>{statusText(comment.status)}</td>
                                <td>{comment.created_at}</td>
                                <td>
                                    <button className="admin-button danger" onClick={() => setPendingDelete(comment)}><FiTrash2 /> 删除</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>}
            <div className="admin-pagination">
                <span className="admin-muted">共 {total} 条</span>
                <button className="admin-button" disabled={page <= 1} onClick={() => load(page - 1)}>上一页</button>
                <button className="admin-button" disabled={page * 20 >= total} onClick={() => load(page + 1)}>下一页</button>
            </div>
            {pendingDelete && (
                <div className="admin-modal-backdrop" role="presentation">
                    <div className="admin-confirm-modal">
                        <div className="admin-modal-icon"><FiTrash2 /></div>
                        <h3>删除评论</h3>
                        <p>确认删除这条评论吗？删除后前台将不再展示。</p>
                        <div className="admin-modal-actions">
                            <button className="admin-button" onClick={() => setPendingDelete(null)}>取消</button>
                            <button className="admin-button danger" onClick={remove}>确认删除</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminComments;
