// pages/Friends/FriendList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { friendApi } from '../../api/friend';
import { messageApi } from '../../api/message';
import SearchUsers from '../../components/User/SearchUsers';
import { getCurrentUser } from '../../api/user';
import './Friends.css';

const FriendList = () => {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeGroup, setActiveGroup] = useState('all');
    const [friendGroups, setFriendGroups] = useState([]);
    const [onlineStatus, setOnlineStatus] = useState({});
    const [showSearch, setShowSearch] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        online: 0,
        groups: 0
    });
    const navigate = useNavigate();

    // 获取好友列表
    // 获取好友列表
    const fetchFriends = useCallback(async () => {
        try {
            setLoading(true);
            const response = await friendApi.listFriends({
                page_stats: {
                    page: 1,
                    size: 100
                }
            });

            console.log('好友列表响应:', response);

            if (response && response.friends) {
                const friendsList = response.friends;
                setFriends(friendsList);
                setStats(prev => ({
                    ...prev,
                    total: friendsList.length
                }));

                // 提取分组
                const groups = new Set(['全部']);
                friendsList.forEach(friend => {
                    if (friend.group_name) {
                        groups.add(friend.group_name);
                    }
                });
                setFriendGroups(Array.from(groups));
                setStats(prev => ({
                    ...prev,
                    groups: groups.size - 1 // 减去"全部"
                }));

                // 批量获取在线状态
                const userIds = friendsList.map(f => f.friend?.id || f.id).filter(id => id);
                if (userIds.length > 0) {
                    const onlineResponse = await friendApi.batchGetUserOnlineStatus(userIds);
                    console.log('在线状态响应:', onlineResponse);

                    // 处理可能的不同字段名
                    const statusData = onlineResponse?.statuses || onlineResponse?.online_status;
                    if (statusData) {
                        setOnlineStatus(statusData);
                        // 计算在线好友数
                        const onlineCount = Object.values(statusData).filter(status => status === 1).length;
                        setStats(prev => ({ ...prev, online: onlineCount }));
                    }
                }
            }
        } catch (error) {
            console.error('获取好友列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 搜索好友
    const handleSearch = async (query) => {
        setSearchQuery(query);

        if (!query.trim()) {
            // 如果搜索框为空，重新加载完整列表
            await fetchFriends();
            return;
        }

        try {
            const searchResponse = await friendApi.searchUsers(query, {
                page_stats: {
                    page: 1,
                    size: 20
                }
            });

            if (searchResponse && searchResponse.users) {
                // 检查这些用户是否是好友
                const currentFriends = friends.reduce((map, friend) => {
                    const friendId = friend.friend?.id || friend.id;
                    if (friendId) {
                        map[friendId] = friend;
                    }
                    return map;
                }, {});

                const searchResults = searchResponse.users.map(user => {
                    const existingFriend = currentFriends[user.id];
                    if (existingFriend) {
                        return existingFriend;
                    }
                    return {
                        id: user.id,
                        friend: user,
                        remark: '',
                        group_name: '',
                        status: 0 // 不是好友
                    };
                });
                setFriends(searchResults);
            }
        } catch (error) {
            console.error('搜索好友失败:', error);
        }
    };

    // 删除好友
    const handleDeleteFriend = async (friendId, e) => {
        e.stopPropagation(); // 阻止点击卡片
        if (!window.confirm('确定要删除这个好友吗？删除后将不能查看对方动态。')) {
            return;
        }

        try {
            await friendApi.deleteFriend(friendId);
            setFriends(prev => prev.filter(f =>
                (f.friend?.id || f.id) !== friendId
            ));
            setStats(prev => ({
                ...prev,
                total: prev.total - 1,
                online: prev.online - (onlineStatus[friendId] === 1 ? 1 : 0)
            }));
        } catch (error) {
            console.error('删除好友失败:', error);
            alert('删除失败，请重试');
        }
    };

    // 更新好友备注
    const handleUpdateRemark = async (friendId, currentRemark, e) => {
        e.stopPropagation();
        const newRemark = prompt('请输入新的备注：', currentRemark || '');
        if (newRemark === null) return;

        try {
            await friendApi.updateFriendRemark(friendId, newRemark);
            setFriends(prev =>
                prev.map(friend => {
                    const friendIdToCompare = friend.friend?.id || friend.id;
                    return friendIdToCompare === friendId
                        ? { ...friend, remark: newRemark }
                        : friend
                })
            );
        } catch (error) {
            console.error('更新备注失败:', error);
            alert('更新失败，请重试');
        }
    };

    // 设置好友分组
    const handleSetGroup = async (friendId, currentGroup, e) => {
        e.stopPropagation();
        const newGroup = prompt('请输入分组名称（留空则取消分组）：', currentGroup || '');
        if (newGroup === null) return;

        try {
            await friendApi.setFriendGroup(friendId, newGroup);
            setFriends(prev =>
                prev.map(friend => {
                    const friendIdToCompare = friend.friend?.id || friend.id;
                    return friendIdToCompare === friendId
                        ? { ...friend, group_name: newGroup }
                        : friend
                })
            );

            // 更新分组列表
            if (newGroup && !friendGroups.includes(newGroup)) {
                setFriendGroups(prev => [...prev, newGroup]);
                setStats(prev => ({
                    ...prev,
                    groups: prev.groups + 1
                }));
            }
        } catch (error) {
            console.error('设置分组失败:', error);
            alert('设置失败，请重试');
        }
    };

    // 发起聊天（点击卡片直接进入）
    const handleStartChat = async (friendId) => {
        try {
            const response = await messageApi.createConversation(friendId, 0, '');
            if (response && response.conversation_id) {
                navigate(`/chat/single/${friendId}`, {
                    state: {
                        conversationId: response.conversation_id,
                        conversation: {
                            id: response.conversation_id,
                            type: 0,
                            target_id: friendId
                        }
                    }
                });
            } else {
                throw new Error('创建会话失败');
            }
        } catch (error) {
            console.error('发起聊天失败:', error);
            alert('发起聊天失败，请重试');
        }
    };

    // 获取在线状态文本
    const getOnlineStatusText = (status) => {
        switch (status) {
            case 1: return '在线';
            case 2: return '忙碌';
            case 3: return '离开';
            default: return '离线';
        }
    };

    // 获取在线状态颜色
    const getOnlineStatusColor = (status) => {
        switch (status) {
            case 1: return '#4CAF50';
            case 2: return '#F44336';
            case 3: return '#FF9800';
            default: return '#9E9E9E';
        }
    };

    // 过滤好友
    const filteredFriends = friends.filter(friend => {
        const friendId = friend.friend?.id || friend.id;
        const friendName = friend.remark || friend.friend?.name || friend.name || '';
        const friendUsername = friend.friend?.username || '';

        // 分组过滤
        if (activeGroup !== 'all' && friend.group_name !== activeGroup) {
            return false;
        }

        // 搜索过滤
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const name = friendName.toLowerCase();
            const username = friendUsername.toLowerCase();
            return name.includes(query) || username.includes(query);
        }

        return true;
    });

    // 按在线状态排序
    const sortedFriends = [...filteredFriends].sort((a, b) => {
        const friendIdA = a.friend?.id || a.id;
        const friendIdB = b.friend?.id || b.id;
        const statusA = onlineStatus[friendIdA] || 0;
        const statusB = onlineStatus[friendIdB] || 0;

        // 在线状态降序排列（在线 > 离线）
        if (statusA !== statusB) {
            return statusB - statusA;
        }

        // 字母顺序
        const nameA = (a.remark || a.friend?.name || a.name || '').toLowerCase();
        const nameB = (b.remark || b.friend?.name || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    // 搜索用户回调
    const handleUserSelect = (user) => {
        navigate(`/user/${user.id}`);
    };

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    if (loading && friends.length === 0) {
        return (
            <div className="friend-list-loading">
                <div className="loading-spinner"></div>
                <p>加载好友列表中...</p>
            </div>
        );
    }

    return (
        <div className="friend-list-page">
            <div className="friend-list-header">
                <h2>好友列表</h2>
                <div className="friend-list-actions">
                    <button
                        className="search-users-btn"
                        onClick={() => setShowSearch(true)}
                    >
                        搜索用户
                    </button>
                    <Link to="/friend-requests" className="friend-requests-link">
                        好友申请
                        <span className="request-count">{/* 这里可以显示未处理的申请数 */}</span>
                    </Link>
                </div>
            </div>

            {showSearch && (
                <div className="search-modal">
                    <div className="search-modal-content">
                        <div className="search-modal-header">
                            <h3>搜索用户</h3>
                            <button
                                className="close-search-btn"
                                onClick={() => setShowSearch(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <SearchUsers
                            onUserSelect={handleUserSelect}
                            showActions={true}
                            showAddFriend={true}
                        />
                    </div>
                </div>
            )}

            <div className="friend-list-search">
                <input
                    type="text"
                    placeholder="搜索好友..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="friend-search-input"
                />
            </div>

            <div className="friend-stats">
                <div className="stat-item">
                    <strong>{stats.total}</strong>
                    <span>全部好友</span>
                </div>
                <div className="stat-item">
                    <strong>{stats.online}</strong>
                    <span>在线好友</span>
                </div>
                <div className="stat-item">
                    <strong>{stats.groups}</strong>
                    <span>分组数量</span>
                </div>
            </div>

            <div className="friend-list-tabs">
                <div className="friend-groups">
                    {friendGroups.map(group => (
                        <button
                            key={group}
                            className={`friend-group-tab ${activeGroup === group ? 'active' : ''}`}
                            onClick={() => setActiveGroup(group)}
                        >
                            {group}
                            {group !== '全部' && (
                                <span className="group-count">
                                    ({friends.filter(f => f.group_name === group).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="friend-list-container">
                {sortedFriends.length === 0 ? (
                    <div className="empty-friend-list">
                        <div className="empty-icon">👥</div>
                        <h3>暂无好友</h3>
                        <p>快去添加好友吧！</p>
                        <button
                            className="add-friend-btn"
                            onClick={() => setShowSearch(true)}
                        >
                            添加好友
                        </button>
                    </div>
                ) : (
                    <div className="friends-grid">
                        {sortedFriends.map(friend => {
                            const friendId = friend.friend?.id || friend.id;
                            const friendName = friend.remark || friend.friend?.name || friend.name || '未知用户';
                            const friendAvatar = friend.friend?.avatar || friend.avatar || '/default-avatar.png';
                            const originalName = friend.friend?.name || friend.name;
                            const statusColor = getOnlineStatusColor(onlineStatus[friendId]);

                            return (
                                <div
                                    key={friendId}
                                    className="friend-card"
                                    onClick={() => handleStartChat(friendId)}
                                >
                                    <div className="friend-avatar" onClick={(e) => e.stopPropagation()}>
                                        <img
                                            src={friendAvatar}
                                            alt={friendName}
                                            className="avatar-img"
                                        />
                                        <div
                                            className="online-indicator"
                                            style={{ backgroundColor: statusColor }}
                                            title={getOnlineStatusText(onlineStatus[friendId])}
                                        />
                                    </div>

                                    <div className="friend-info">
                                        <div className="friend-name">
                                            <h4>{friendName}</h4>
                                            {friend.remark && originalName && friend.remark !== originalName && (
                                                <span className="original-name">
                                                    ({originalName})
                                                </span>
                                            )}
                                        </div>

                                        {friend.group_name && (
                                            <div className="friend-group">
                                                <span className="group-tag">{friend.group_name}</span>
                                            </div>
                                        )}

                                        <div className="friend-actions" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className="action-btn chat-btn"
                                                onClick={() => handleStartChat(friendId)}
                                                title="发起聊天"
                                            >
                                                💬
                                            </button>
                                            <button
                                                className="action-btn remark-btn"
                                                onClick={(e) => handleUpdateRemark(friendId, friend.remark, e)}
                                                title="修改备注"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="action-btn group-btn"
                                                onClick={(e) => handleSetGroup(friendId, friend.group_name, e)}
                                                title="设置分组"
                                            >
                                                📁
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={(e) => handleDeleteFriend(friendId, e)}
                                                title="删除好友"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendList;