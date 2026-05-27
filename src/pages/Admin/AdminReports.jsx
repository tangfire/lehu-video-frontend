import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFlag } from 'react-icons/fi';
import { campusAdminApi } from '../../api/admin';
import './Admin.css';

const reportStatusText = (status) => {
    const map = { 0: '待处理', 1: '已处理', 2: '已驳回' };
    return map[Number(status)] || '未知';
};

const AdminReports = () => {
    const [searchParams] = useSearchParams();
    const statusParam = searchParams.get('status') || '-1';
    const [reports, setReports] = useState([]);
    const [status, setStatus] = useState(statusParam);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const load = async (nextPage = page, nextStatus = status) => {
        setLoading(true);
        setError('');
        try {
            const data = await campusAdminApi.listReports({ page: nextPage, size: 20, status: nextStatus });
            setReports(data.reports || []);
            setTotal(data.page_stats?.total || 0);
            setPage(nextPage);
        } catch (err) {
            setError(err.message || '获取举报失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setStatus(statusParam);
        load(1, statusParam);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusParam]);

    const review = async (report, action) => {
        try {
            await campusAdminApi.reviewReport(report.id, { action, reason: action === 'resolve' ? '已处理' : '已驳回' });
            setMessage(action === 'resolve' ? '举报已标记处理' : '举报已驳回');
            window.setTimeout(() => setMessage(''), 2400);
            load(page);
        } catch (err) {
            setError(err.message || '处理举报失败');
        }
    };

    return (
        <>
            {message && <div className="admin-toast success">{message}</div>}
            <div className="admin-toolbar">
                <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="-1">全部举报</option>
                    <option value="0">待处理</option>
                    <option value="1">已处理</option>
                    <option value="2">已驳回</option>
                </select>
                <button className="admin-button primary" onClick={() => load(1)}>查询</button>
            </div>
            {error && <div className="admin-error">{error}</div>}
            {loading && <div className="admin-loading">举报加载中...</div>}
            {!loading && reports.length === 0 && (
                <div className="admin-empty">
                    <FiFlag />
                    <span>暂无举报事项</span>
                </div>
            )}
            {!loading && reports.length > 0 && <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>举报对象</th>
                            <th>原因</th>
                            <th>举报人</th>
                            <th>状态</th>
                            <th>时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report) => (
                            <tr key={report.id}>
                                <td className="admin-title-cell">
                                    <strong>{report.target_type === 'post' ? report.target?.title : report.comment?.content}</strong>
                                    <div className="admin-muted">#{report.target_id}</div>
                                </td>
                                <td>
                                    <div>{report.reason}</div>
                                    <div className="admin-muted">{report.detail}</div>
                                </td>
                                <td>{report.reporter?.name || report.reporter?.nickname || '同学'}</td>
                                <td>{reportStatusText(report.status)}</td>
                                <td>{report.created_at}</td>
                                <td>
                                    <div className="admin-actions">
                                        <button className="admin-button" onClick={() => review(report, 'resolve')}>标记处理</button>
                                        <button className="admin-button" onClick={() => review(report, 'reject')}>驳回</button>
                                    </div>
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
        </>
    );
};

export default AdminReports;
