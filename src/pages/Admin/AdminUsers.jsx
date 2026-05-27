import { useEffect, useState } from 'react';
import { campusAdminApi } from '../../api/admin';
import { roleText } from './adminUtils';
import './Admin.css';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState('');

    const load = async (nextPage = page) => {
        setError('');
        try {
            const data = await campusAdminApi.listUsers({ page: nextPage, size: 20, keyword });
            setUsers(data.users || []);
            setTotal(data.page_stats?.total || 0);
            setPage(nextPage);
        } catch (err) {
            setError(err.message || '获取用户失败');
        }
    };

    useEffect(() => {
        load(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setRole = async (item, role) => {
        await campusAdminApi.updateUserRole(item.user.id, role);
        load(page);
    };

    return (
        <>
            <div className="admin-toolbar">
                <input className="admin-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索昵称、姓名、学号、手机号" />
                <button className="admin-button primary" onClick={() => load(1)}>查询</button>
            </div>
            {error && <div className="admin-error">{error}</div>}
            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>用户</th>
                            <th>校园资料</th>
                            <th>角色</th>
                            <th>注册时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((item) => (
                            <tr key={item.user.id}>
                                <td>
                                    <strong>{item.user.nickname || item.user.name || '同学'}</strong>
                                    <div className="admin-muted">#{item.user.id} · {item.user.mobile || item.user.email}</div>
                                </td>
                                <td>
                                    <div>{item.profile?.real_name || '未填写'} {item.profile?.student_no || ''}</div>
                                    <div className="admin-muted">{item.profile?.class_name || ''} {item.profile?.dorm_building || ''}{item.profile?.room_no || ''}</div>
                                </td>
                                <td>{roleText(item.role)}</td>
                                <td>{item.user.created_at}</td>
                                <td>
                                    <div className="admin-actions">
                                        <button className="admin-button" onClick={() => setRole(item, 'operator')}>设运营</button>
                                        <button className="admin-button" onClick={() => setRole(item, 'admin')}>设管理员</button>
                                        <button className="admin-button danger" onClick={() => setRole(item, 'user')}>移除权限</button>
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

export default AdminUsers;
