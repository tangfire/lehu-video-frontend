import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { friendApi } from '../../api/friend';
import { webSocketAPI } from '../../api/websocket';
import SearchUsers from '../../components/User/SearchUsers';
import './Friends.css';

const FriendList = () => {
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeGroup, setActiveGroup] = useState('all'); // 'all', 'recent', 'groups'
    const [friendGroups, setFriendGroups] = useState([]);
    const [onlineStatus, setOnlineStatus] = useState({});
    const [showSearch, setShowSearch] = useState(false);
    const navigate = useNavigate();

    // 获取好友列表
    const fetchFriends = useCallback(async () => {
        try {
            setLoading(true);
            const response = await friendApi.listFriends({
                page: 1,
                page_size: 100
            });

            if (response && response.friends) {
                setFriends(response.friends);

                // 提取分组
                const groups = ['全部'];
                response.friends.forEach(friend => {
                    if (friend.group_name && !groups.includes(friend.group_name)) {
                        groups.push(friend.group_name);
                    }
                });
                setFriendGroups(groups);

                // 批量获取在线状态
                const userIds = response.friends.map(f => f.friend.id);
                if (userIds.length > 0) {
                    const onlineResponse = await friendApi.batchGetUserOnlineStatus(userIds);
                    if (onlineResponse && onlineResponse.online_status) {
                        setOnlineStatus(onlineResponse.online_status);
                    }
                }
            }
        } catch (error) {
            console.error('获取好友列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // 搜索好友 - 现在使用POST请求
    const handleSearch = async (query) => {
        setSearchQuery(query);

        if (!query.trim()) {
            // 如果搜索框为空，重新加载完整列表
            await fetchFriends();
            return;
        }

        try {
            const searchResponse = await friendApi.searchUsers(query, {
                page: 1,
                page_size: 20
            });

            if (searchResponse && searchResponse.users) {
                // 将搜索结果格式化为好友列表格式
                const searchResults = searchResponse.users.map(user => ({
                    id: user.id,
                    friend: user,
                    remark: '',
                    group_name: '',
                    status: 1
                }));
                setFriends(searchResults);
            }
        } catch (error) {
            console.error('搜索好友失败:', error);
        }
    };

    // 删除好友
    const handleDeleteFriend = async (friendId) => {
        if (!window.confirm('确定要删除这个好友吗？')) {
            return;
        }

        try {
            await friendApi.deleteFriend(friendId);
            setFriends(prev => prev.filter(f => f.friend.id !== friendId));
        } catch (error) {
            console.error('删除好友失败:', error);
            alert('删除失败，请重试');
        }
    };

    // 更新好友备注
    const handleUpdateRemark = async (friendId, currentRemark) => {
        const newRemark = prompt('请输入新的备注：', currentRemark || '');
        if (newRemark === null) return; // 用户取消

        try {
            await friendApi.updateFriendRemark(friendId, newRemark);
            setFriends(prev =>
                prev.map(friend =>
                    friend.friend.id === friendId
                        ? { ...friend, remark: newRemark }
                        : friend
                )
            );
        } catch (error) {
            console.error('更新备注失败:', error);
            alert('更新失败，请重试');
        }
    };

    // 设置好友分组
    const handleSetGroup = async (friendId, currentGroup) => {
        const newGroup = prompt('请输入分组名称（留空则取消分组）：', currentGroup || '');
        if (newGroup === null) return;

        try {
            await friendApi.setFriendGroup(friendId, newGroup);
            setFriends(prev =>
                prev.map(friend =>
                    friend.friend.id === friendId
                        ? { ...friend, group_name: newGroup }
                        : friend
                )
            );

            // 更新分组列表
            if (newGroup && !friendGroups.includes(newGroup)) {
                setFriendGroups(prev => [...prev, newGroup]);
            }
        } catch (error) {
            console.error('设置分组失败:', error);
            alert('设置失败，请重试');
        }
    };

    // 发起聊天
    const handleStartChat = (friendId) => {
        navigate(`/chat/single/${friendId}`);
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
            case 1: return '#4CAF50'; // 绿色 - 在线
            case 2: return '#F44336'; // 红色 - 忙碌
            case 3: return '#FF9800'; // 橙色 - 离开
            default: return '#9E9E9E'; // 灰色 - 离线
        }
    };

    // 过滤好友
    const filteredFriends = friends.filter(friend => {
        // 分组过滤
        if (activeGroup !== 'all' && friend.group_name !== activeGroup) {
            return false;
        }

        // 搜索过滤
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const name = (friend.remark || friend.friend.name || '').toLowerCase();
            const username = (friend.friend.username || '').toLowerCase();
            return name.includes(query) || username.includes(query);
        }

        return true;
    });

    // 按在线状态排序
    const sortedFriends = [...filteredFriends].sort((a, b) => {
        const statusA = onlineStatus[a.friend.id] || 0;
        const statusB = onlineStatus[b.friend.id] || 0;

        // 在线状态降序排列（在线 > 离线）
        if (statusA !== statusB) {
            return statusB - statusA;
        }

        // 字母顺序
        const nameA = (a.remark || a.friend.name || '').toLowerCase();
        const nameB = (b.remark || b.friend.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    // 搜索用户回调
    const handleUserSelect = (user) => {
        // 跳转到用户主页
        navigate(`/user/${user.id}`);
    };

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    if (loading) {
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

            <div className="friend-list-tabs">
                <div className="friend-groups">
                    {friendGroups.map(group => (
                        <button
                            key={group}
                            className={`friend-group-tab ${activeGroup === group ? 'active' : ''}`}
                            onClick={() => setActiveGroup(group)}
                        >
                            {group}
                        </button>
                    ))}
                </div>
            </div>

            <div className="friend-stats">
                <div className="stat-item">
                    <strong>{friends.length}</strong>
                    <span>全部好友</span>
                </div>
                <div className="stat-item">
                    <strong>
                        {Object.values(onlineStatus).filter(status => status === 1).length}
                    </strong>
                    <span>在线好友</span>
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
                            const isOnline = onlineStatus[friend.friend.id] === 1;
                            const statusColor = getOnlineStatusColor(onlineStatus[friend.friend.id]);

                            return (
                                <div key={friend.friend.id} className="friend-card">
                                    <div className="friend-avatar">
                                        <img
                                            src={friend.friend.avatar || '/default-avatar.png'}
                                            alt={friend.remark || friend.friend.name}
                                            className="avatar-img"
                                        />
                                        <div
                                            className="online-indicator"
                                            style={{ backgroundColor: statusColor }}
                                            title={getOnlineStatusText(onlineStatus[friend.friend.id])}
                                        />
                                    </div>

                                    <div className="friend-info">
                                        <div className="friend-name">
                                            <h4>{friend.remark || friend.friend.name || '未知用户'}</h4>
                                            {friend.remark && (
                                                <span className="original-name">
                          ({friend.friend.name})
                        </span>
                                            )}
                                        </div>

                                        {friend.group_name && (
                                            <div className="friend-group">
                                                <span className="group-tag">{friend.group_name}</span>
                                            </div>
                                        )}

                                        <div className="friend-actions">
                                            <button
                                                className="action-btn chat-btn"
                                                onClick={() => handleStartChat(friend.friend.id)}
                                                title="发起聊天"
                                            >
                                                💬
                                            </button>
                                            <button
                                                className="action-btn remark-btn"
                                                onClick={() => handleUpdateRemark(friend.friend.id, friend.remark)}
                                                title="修改备注"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="action-btn group-btn"
                                                onClick={() => handleSetGroup(friend.friend.id, friend.group_name)}
                                                title="设置分组"
                                            >
                                                📁
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={() => handleDeleteFriend(friend.friend.id)}
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