import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

    const load = async (nextPage = page, nextStatus = status) => {
        setError('');
        try {
            const data = await campusAdminApi.listComments({ page: nextPage, size: 20, status: nextStatus });
            setComments(data.comments || []);
            setTotal(data.page_stats?.total || 0);
            setPage(nextPage);
        } catch (err) {
            setError(err.message || '获取评论失败');
        }
    };

    useEffect(() => {
        setStatus(statusParam);
        load(1, statusParam);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusParam]);

    const remove = async (comment) => {
        if (!window.confirm('确认删除这条评论吗？')) return;
        await campusAdminApi.deleteComment(comment.id);
        load(page);
    };

    return (
        <>
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
            <div className="admin-table-wrap">
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
                                    <button className="admin-button danger" onClick={() => remove(comment)}>删除</button>
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

export default AdminComments;
