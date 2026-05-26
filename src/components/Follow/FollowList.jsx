import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../../api/user';
import {followApi} from '../../api/follow';
import FollowButton from './FollowButton';
import { logger } from '../../utils/logger';
import './FollowList.css';

const FollowList = ({ userId, type = 'following', showTitle = true }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const user = getCurrentUser();
        setCurrentUser(user);
        loadUsers(1);
    }, [userId, type]);

    const loadUsers = async (pageNum = 1) => {
        try {
            setLoading(true);

            let response;
            if (type === 'following') {
                response = await followApi.getFollowingList(userId, pageNum, 20);
            } else if (type === 'followers') {
                response = await followApi.getFollowerList(userId, pageNum, 20);
            } else if (type === 'mutual') {
                response = await followApi.getMutualFollowList(userId, pageNum, 20);
            }

            if (response && response.users) {
                const userList = response.users || [];

                if (pageNum === 1) {
                    setUsers(userList);
                } else {
                    setUsers(prev => [...prev, ...userList]);
                }

                // 根据proto，分页信息在page_stats中
                const totalCount = response.page_stats?.total || 0;
                setTotal(totalCount);

                // 判断是否还有更多数据
                const currentSize = response.page_stats?.size || 20;
                const currentCount = userList.length;
                setHasMore(currentCount >= currentSize);
                setPage(pageNum);
            }
        } catch (error) {
            logger.warn('加载关注列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            loadUsers(page + 1);
        }
    };

    const handleFollowChange = (userId, isFollowing) => {
        setUsers(prev => prev.map(user =>
            user.id === userId ? { ...user, is_following: isFollowing } : user
        ));
    };

    const getTitle = () => {
        switch (type) {
            case 'following':
                return `关注 (${total})`;
            case 'followers':
                return `粉丝 (${total})`;
            case 'mutual':
                return `互相关注 (${total})`;
            default:
                return `关注列表 (${total})`;
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="follow-list loading">
                <div className="loading-spinner"></div>
                <p>加载中...</p>
            </div>
        );
    }

    return (
        <div className="follow-list">
            {showTitle && <h3 className="follow-list-title">{getTitle()}</h3>}

            {users.length === 0 ? (
                <div className="empty-follow">
                    <div className="empty-icon">👤</div>
                    <p className="empty-text">
                        {type === 'following' ? '还没有关注任何人' :
                            type === 'followers' ? '还没有粉丝' :
                                '还没有互相关注的用户'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="follow-user-grid">
                        {users.map(user => (
                            <div key={user.id} className="follow-user-card">
                                <Link to={`/user/${user.id}`} className="user-link">
                                    <img
                                        src={user.avatar || '/default-avatar.png'}
                                        alt={user.name}
                                        className="user-avatar"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/default-avatar.png';
                                        }}
                                    />
                                    <div className="user-info">
                                        <h4 className="user-name">{user.name || '用户'}</h4>
                                        <p className="user-bio">短视频创作者</p>
                                    </div>
                                </Link>

                                {currentUser && currentUser.id !== user.id && (
                                    <div className="user-actions">
                                        <FollowButton
                                            userId={user.id}
                                            initialIsFollowing={user.is_following || false}
                                            onFollowChange={(isFollowing) =>
                                                handleFollowChange(user.id, isFollowing)
                                            }
                                            size="small"
                                            showText={true}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="load-more-container">
                            <button
                                onClick={handleLoadMore}
                                disabled={loading}
                                className="load-more-btn"
                            >
                                {loading ? '加载中...' : '加载更多'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default FollowList;
