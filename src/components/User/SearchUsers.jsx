import React, { useState } from 'react';
import { friendApi } from '../../api/friend';
import './SearchUsers.css';

const SearchUsers = ({ onUserSelect, showActions = true, showAddFriend = true }) => {
    const [keyword, setKeyword] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);

    // 搜索用户
    const handleSearch = async (e) => {
        e?.preventDefault();

        if (!keyword.trim()) {
            setError('请输入搜索关键词');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await friendApi.searchUsers(keyword, {
                page: 1,
                page_size: 20
            });

            if (response && response.users) {
                setUsers(response.users);
                setHasMore(response.page_stats && response.page_stats.has_next);
                setPage(1);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error('搜索用户失败:', error);
            setError(`搜索失败: ${error.message || '未知错误'}`);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    // 加载更多
    const handleLoadMore = async () => {
        if (loading || !hasMore) return;

        try {
            setLoading(true);

            const response = await friendApi.searchUsers(keyword, {
                page: page + 1,
                page_size: 20
            });

            if (response && response.users) {
                setUsers(prev => [...prev, ...response.users]);
                setHasMore(response.page_stats && response.page_stats.has_next);
                setPage(prev => prev + 1);
            }
        } catch (error) {
            console.error('加载更多用户失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 添加好友
    const handleAddFriend = async (userId) => {
        if (!window.confirm('确定要发送好友申请吗？')) {
            return;
        }

        try {
            const applyReason = prompt('请输入申请理由（可选）：', '');
            await friendApi.sendFriendApply(userId, applyReason);
            alert('好友申请已发送！');
        } catch (error) {
            console.error('发送好友申请失败:', error);
            alert(`发送失败: ${error.message || '未知错误'}`);
        }
    };

    // 清空搜索
    const handleClearSearch = () => {
        setKeyword('');
        setUsers([]);
        setError(null);
    };

    return (
        <div className="search-users-container">
            <form className="search-users-form" onSubmit={handleSearch}>
                <div className="search-input-group">
                    <input
                        type="text"
                        placeholder="搜索用户名、昵称或手机号..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="search-input"
                    />
                    <button
                        type="button"
                        onClick={handleClearSearch}
                        className="clear-btn"
                        disabled={!keyword}
                    >
                        ✕
                    </button>
                    <button
                        type="submit"
                        className="search-btn"
                        disabled={loading || !keyword.trim()}
                    >
                        {loading ? '搜索中...' : '搜索'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="search-error">
                    <p>{error}</p>
                </div>
            )}

            {users.length > 0 ? (
                <div className="search-results">
                    <div className="results-header">
                        <h3>搜索结果 ({users.length})</h3>
                    </div>

                    <div className="users-list">
                        {users.map(user => (
                            <div key={user.id} className="user-item">
                                <div className="user-info">
                                    <img
                                        src={user.avatar || '/default-avatar.png'}
                                        alt={user.name}
                                        className="user-avatar"
                                    />
                                    <div className="user-details">
                                        <h4 className="user-name">{user.name || '未知用户'}</h4>
                                        {user.username && (
                                            <p className="user-username">@{user.username}</p>
                                        )}
                                        {user.signature && (
                                            <p className="user-signature">{user.signature}</p>
                                        )}
                                        <div className="user-stats">
                                            {user.follower_count !== undefined && (
                                                <span className="stat-item">
                          粉丝: {user.follower_count}
                        </span>
                                            )}
                                            {user.follow_count !== undefined && (
                                                <span className="stat-item">
                          关注: {user.follow_count}
                        </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="user-actions">
                                    {onUserSelect && (
                                        <button
                                            className="action-btn select-btn"
                                            onClick={() => onUserSelect(user)}
                                            title="选择用户"
                                        >
                                            选择
                                        </button>
                                    )}

                                    {showActions && (
                                        <>
                                            <button
                                                className="action-btn view-btn"
                                                onClick={() => window.open(`/user/${user.id}`, '_blank')}
                                                title="查看主页"
                                            >
                                                主页
                                            </button>

                                            {showAddFriend && (
                                                <button
                                                    className="action-btn add-friend-btn"
                                                    onClick={() => handleAddFriend(user.id)}
                                                    title="添加好友"
                                                >
                                                    添加
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="load-more">
                            <button
                                className="load-more-btn"
                                onClick={handleLoadMore}
                                disabled={loading}
                            >
                                {loading ? '加载中...' : '加载更多'}
                            </button>
                        </div>
                    )}
                </div>
            ) : keyword && !loading && !error && (
                <div className="no-results">
                    <div className="no-results-icon">👤</div>
                    <h3>未找到相关用户</h3>
                    <p>请尝试其他关键词搜索</p>
                </div>
            )}
        </div>
    );
};

export default SearchUsers;