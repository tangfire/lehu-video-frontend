import React, { useState, useEffect } from 'react';
import { friendApi } from '../../api/friend';
import { userApi } from '../../api/user';
import  {followApi}  from '../../api/follow';
import './SearchUsers.css';

const SearchUsers = ({
                         onUserSelect,
                         showActions = true,
                         showAddFriend = true,
                         initialKeyword = '',
                         placeholder = "搜索用户名、昵称或手机号..."
                     }) => {
    const [keyword, setKeyword] = useState(initialKeyword);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingStates, setLoadingStates] = useState({});

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('userInfo'));
        setCurrentUser(user);

        if (initialKeyword) {
            handleSearch({ preventDefault: () => {} });
        }
    }, [initialKeyword]);

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

            // 使用用户服务的搜索接口
            const response = await userApi.searchUsers({
                keyword: keyword.trim(),
                page_stats: {
                    page: 1,
                    size: 20
                }
            });

            if (response && response.users) {
                // 获取关系信息
                const usersWithRelations = await fetchUserRelations(response.users);
                setUsers(usersWithRelations);
                setHasMore(response.page_stats?.total > response.page_stats?.page * response.page_stats?.size);
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

    // 获取用户关系信息（是否关注、是否好友等）
    const fetchUserRelations = async (users) => {
        if (!currentUser || users.length === 0) return users;

        try {
            // 批量获取用户信息（包含关系）
            const response = await userApi.batchGetUserInfo({
                user_ids: users.map(user => user.id),
                include_relation: true
            });

            if (response && response.users) {
                const userMap = new Map();
                response.users.forEach(user => {
                    userMap.set(user.id, user);
                });

                return users.map(user => {
                    const fullUser = userMap.get(user.id) || user;
                    return {
                        ...user,
                        is_following: fullUser.is_following || false,
                        is_friend: fullUser.is_friend || false,
                        friend_remark: fullUser.friend_remark || '',
                        follow_count: fullUser.follow_count || 0,
                        follower_count: fullUser.follower_count || 0
                    };
                });
            }
        } catch (error) {
            console.error('获取用户关系失败:', error);
        }

        return users;
    };

    // 加载更多
    const handleLoadMore = async () => {
        if (loading || !hasMore) return;

        try {
            setLoading(true);

            const response = await userApi.searchUsers({
                keyword: keyword.trim(),
                page_stats: {
                    page: page + 1,
                    size: 20
                }
            });

            if (response && response.users) {
                const usersWithRelations = await fetchUserRelations(response.users);
                setUsers(prev => [...prev, ...usersWithRelations]);
                setHasMore(response.page_stats?.total > (page + 1) * response.page_stats?.size);
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
        if (loadingStates[`add_friend_${userId}`]) return;

        setLoadingStates(prev => ({ ...prev, [`add_friend_${userId}`]: true }));

        try {
            const applyReason = prompt('请输入申请理由（可选）：', '');
            await friendApi.sendFriendApply(userId, applyReason || '');
            alert('好友申请已发送！');

            // 更新用户状态
            setUsers(prev => prev.map(user =>
                user.id === userId ? { ...user, is_friend: 'pending' } : user
            ));
        } catch (error) {
            console.error('发送好友申请失败:', error);
            alert(`发送失败: ${error.message || '未知错误'}`);
        } finally {
            setLoadingStates(prev => ({ ...prev, [`add_friend_${userId}`]: false }));
        }
    };

    // 关注/取消关注
    const handleFollowToggle = async (userId, isFollowing) => {
        if (loadingStates[`follow_${userId}`]) return;

        setLoadingStates(prev => ({ ...prev, [`follow_${userId}`]: true }));

        try {
            if (isFollowing) {
                await followApi.removeFollow(userId);
                setUsers(prev => prev.map(user =>
                    user.id === userId ? { ...user, is_following: false } : user
                ));
            } else {
                await followApi.addFollow(userId);
                setUsers(prev => prev.map(user =>
                    user.id === userId ? { ...user, is_following: true } : user
                ));
            }
        } catch (error) {
            console.error('关注操作失败:', error);
            alert(error.message || '操作失败，请稍后重试');
        } finally {
            setLoadingStates(prev => ({ ...prev, [`follow_${userId}`]: false }));
        }
    };

    // 清空搜索
    const handleClearSearch = () => {
        setKeyword('');
        setUsers([]);
        setError(null);
        setPage(1);
    };

    // 获取用户关系状态文本
    const getRelationText = (user) => {
        if (user.is_friend === true) return '好友';
        if (user.is_friend === 'pending') return '已发送申请';
        if (user.is_following) return '已关注';
        return '';
    };

    // 获取用户关系样式
    const getRelationClass = (user) => {
        if (user.is_friend === true) return 'relation-badge friend';
        if (user.is_friend === 'pending') return 'relation-badge pending';
        if (user.is_following) return 'relation-badge following';
        return '';
    };

    return (
        <div className="search-users-container">
            <form className="search-users-form" onSubmit={handleSearch}>
                <div className="search-input-group">
                    <input
                        type="text"
                        placeholder={placeholder}
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
                        {keyword && (
                            <button
                                onClick={handleClearSearch}
                                className="clear-results-btn"
                            >
                                清空结果
                            </button>
                        )}
                    </div>

                    <div className="users-list">
                        {users.map(user => {
                            const relationText = getRelationText(user);
                            const relationClass = getRelationClass(user);
                            const isAddingFriend = loadingStates[`add_friend_${user.id}`];
                            const isTogglingFollow = loadingStates[`follow_${user.id}`];

                            return (
                                <div key={user.id} className="user-item">
                                    <div
                                        className="user-info"
                                        onClick={() => onUserSelect && onUserSelect(user)}
                                        style={{ cursor: onUserSelect ? 'pointer' : 'default' }}
                                    >
                                        <img
                                            src={user.avatar || '/default-avatar.png'}
                                            alt={user.name}
                                            className="user-avatar"
                                        />
                                        <div className="user-details">
                                            <div className="user-header">
                                                <h4 className="user-name">{user.name || '未知用户'}</h4>
                                                {relationText && (
                                                    <span className={relationClass}>{relationText}</span>
                                                )}
                                            </div>
                                            {user.nickname && user.nickname !== user.name && (
                                                <p className="user-nickname">{user.nickname}</p>
                                            )}
                                            {user.signature && (
                                                <p className="user-signature">{user.signature}</p>
                                            )}
                                            <div className="user-stats">
                        <span className="stat-item">
                          粉丝: {user.follower_count || 0}
                        </span>
                                                <span className="stat-item">
                          关注: {user.follow_count || 0}
                        </span>
                                                <span className="stat-item">
                          获赞: {user.total_favorited || 0}
                        </span>
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

                                        {showActions && currentUser && currentUser.id !== user.id && (
                                            <>
                                                {!user.is_friend && showAddFriend && (
                                                    <button
                                                        className="action-btn add-friend-btn"
                                                        onClick={() => handleAddFriend(user.id)}
                                                        disabled={isAddingFriend || user.is_friend === 'pending'}
                                                        title="添加好友"
                                                    >
                                                        {isAddingFriend ? '发送中...' :
                                                            user.is_friend === 'pending' ? '已发送' : '加好友'}
                                                    </button>
                                                )}

                                                <button
                                                    className={`action-btn follow-btn ${user.is_following ? 'following' : ''}`}
                                                    onClick={() => handleFollowToggle(user.id, user.is_following)}
                                                    disabled={isTogglingFollow}
                                                    title={user.is_following ? '取消关注' : '关注'}
                                                >
                                                    {isTogglingFollow ? '...' :
                                                        user.is_following ? '已关注' : '关注'}
                                                </button>

                                                <button
                                                    className="action-btn view-btn"
                                                    onClick={() => window.open(`/user/${user.id}`, '_blank')}
                                                    title="查看主页"
                                                >
                                                    主页
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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

            {!keyword && (
                <div className="search-tips">
                    <h4>搜索提示：</h4>
                    <ul>
                        <li>可以搜索用户名、昵称、手机号或邮箱</li>
                        <li>支持模糊搜索，如"张"会匹配所有姓张的用户</li>
                        <li>搜索结果会显示用户的粉丝数和关注数</li>
                        <li>可以直接在搜索结果中添加好友或关注</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchUsers;