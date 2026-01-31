import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { messageApi } from '../../api/message';
import { friendApi } from '../../api/friend';
import { groupApi } from '../../api/group';
import { useWebSocket } from '../../components/WebSocket/WebSocketProvider';
import { getCurrentUser } from '../../api/user';
import './Chat.css';

const ChatList = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'single', 'group'
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const navigate = useNavigate();

    const currentUser = getCurrentUser();
    const { unreadCount, connectionStatus, reconnect } = useWebSocket();

    // 获取会话列表
    const fetchConversations = useCallback(async (pageNum = 1, isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError(null);

            // 修改参数结构，匹配proto定义
            const response = await messageApi.listConversations({
                page_stats: {
                    page: pageNum,
                    size: 20
                }
            });

            if (response && response.conversations) {
                if (pageNum === 1) {
                    setConversations(response.conversations);
                } else {
                    setConversations(prev => [...prev, ...response.conversations]);
                }

                setHasMore(response.page_stats?.has_next || false);
                setPage(pageNum);

                // 重新计算过滤后的列表
                filterConversations(response.conversations, activeTab, searchQuery, pageNum === 1);
            } else {
                setConversations([]);
                setFilteredConversations([]);
            }
        } catch (error) {
            console.error('获取会话列表失败:', error);
            setError('获取会话列表失败，请检查网络连接');

            // 如果未登录，显示提示
            if (error.response?.status === 401) {
                setError('请先登录');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, searchQuery]);

    // 过滤和搜索会话
    const filterConversations = useCallback((convs, tab, query, replace = false) => {
        let filtered = [...convs];

        // 按类型过滤
        if (tab === 'single') {
            filtered = filtered.filter(conv => conv.type === 0);
        } else if (tab === 'group') {
            filtered = filtered.filter(conv => conv.type === 1);
        }

        // 按搜索词过滤
        if (query.trim()) {
            const searchStr = query.toLowerCase();
            filtered = filtered.filter(conv => {
                const name = conv.name ? conv.name.toLowerCase() : '';
                const lastMessage = conv.last_message ? conv.last_message.toLowerCase() : '';

                return name.includes(searchStr) ||
                    lastMessage.includes(searchStr) ||
                    conv.target_id?.toString().includes(searchStr);
            });
        }

        // 按最后消息时间排序（最新的在前面）
        filtered.sort((a, b) => {
            const timeA = a.last_msg_time || 0;
            const timeB = b.last_msg_time || 0;
            return timeB - timeA;
        });

        if (replace) {
            setFilteredConversations(filtered);
        } else {
            setFilteredConversations(prev => [...prev, ...filtered]);
        }
    }, []);

    // 搜索会话
    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        filterConversations(conversations, activeTab, query, true);
    }, [conversations, activeTab, filterConversations]);

    // 过滤会话类型
    const filterByType = useCallback((type) => {
        setActiveTab(type);
        filterConversations(conversations, type, searchQuery, true);
    }, [conversations, searchQuery, filterConversations]);

    // 删除会话
    const handleDeleteConversation = async (conversationId, e) => {
        if (e) e.stopPropagation();

        if (!window.confirm('确定要删除这个会话吗？删除后聊天记录将清空。')) {
            return;
        }

        try {
            await messageApi.deleteConversation(conversationId);

            // 更新状态
            setConversations(prev => prev.filter(conv => conv.id !== conversationId));
            setFilteredConversations(prev => prev.filter(conv => conv.id !== conversationId));

            // 如果有未读计数更新，可能需要重新获取总未读数
        } catch (error) {
            console.error('删除会话失败:', error);
            alert('删除失败，请重试');
        }
    };

    // 创建新会话
    const handleCreateConversation = async (type = 'single') => {
        if (type === 'single') {
            const friendId = prompt('请输入好友ID：');
            if (friendId && !isNaN(friendId)) {
                try {
                    const response = await messageApi.createConversation(
                        parseInt(friendId),
                        0,
                        '你好，我们开始聊天吧！'
                    );

                    if (response && response.conversation_id) {
                        // 创建成功后刷新列表或直接跳转
                        navigate(`/chat/single/${friendId}`, {
                            state: { conversationId: response.conversation_id }
                        });
                    }
                } catch (error) {
                    console.error('创建会话失败:', error);
                    alert('创建会话失败，请检查好友关系或网络连接');
                }
            } else if (friendId) {
                alert('请输入有效的用户ID');
            }
        } else if (type === 'group') {
            const groupId = prompt('请输入群组ID：');
            if (groupId && !isNaN(groupId)) {
                try {
                    const response = await messageApi.createConversation(
                        parseInt(groupId),
                        1,
                        '大家好！'
                    );

                    if (response && response.conversation_id) {
                        navigate(`/chat/group/${groupId}`, {
                            state: { conversationId: response.conversation_id }
                        });
                    }
                } catch (error) {
                    console.error('创建会话失败:', error);
                    alert('创建会话失败，请检查是否已加入该群');
                }
            } else if (groupId) {
                alert('请输入有效的群组ID');
            }
        }
    };

    // 清空聊天记录
    const handleClearMessages = async (conversationId, e) => {
        if (e) e.stopPropagation();

        if (!window.confirm('确定要清空这个会话的聊天记录吗？此操作不可恢复。')) {
            return;
        }

        try {
            await messageApi.clearMessages(conversationId);
            alert('聊天记录已清空');

            // 更新会话的最后消息
            setConversations(prev => prev.map(conv => {
                if (conv.id === conversationId) {
                    return {
                        ...conv,
                        last_message: '',
                        last_msg_time: 0,
                        unread_count: 0
                    };
                }
                return conv;
            }));

            setFilteredConversations(prev => prev.map(conv => {
                if (conv.id === conversationId) {
                    return {
                        ...conv,
                        last_message: '',
                        last_msg_time: 0,
                        unread_count: 0
                    };
                }
                return conv;
            }));
        } catch (error) {
            console.error('清空聊天记录失败:', error);
            alert('清空失败，请重试');
        }
    };

    // 格式化时间
    const formatTime = (timestamp) => {
        if (!timestamp || timestamp === 0) return '';

        try {
            const date = new Date(timestamp * 1000);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            // 如果时间在今天
            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            // 如果时间是昨天
            else if (diffDays === 1) {
                return '昨天';
            }
            // 如果在一周内
            else if (diffDays < 7) {
                const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                return days[date.getDay()];
            }
            // 其他情况显示日期
            else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        } catch (error) {
            return '';
        }
    };

    // 获取消息类型图标
    const getMessageTypeIcon = (msgType) => {
        switch (msgType) {
            case 0: return '💬'; // 文本
            case 1: return '🖼️'; // 图片
            case 2: return '🎵'; // 语音
            case 3: return '🎬'; // 视频
            case 4: return '📎'; // 文件
            case 99: return '📢'; // 系统消息
            default: return '💬';
        }
    };

    // 获取消息预览文本
    const getMessagePreview = (conversation) => {
        if (!conversation.last_message) return '暂无消息';

        const lastMessage = conversation.last_message;

        // 根据消息类型返回不同预览
        switch (conversation.last_msg_type) {
            case 0: // 文本
                return lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage;
            case 1: // 图片
                return '[图片]';
            case 2: // 语音
                return '[语音消息]';
            case 3: // 视频
                return '[视频]';
            case 4: // 文件
                return '[文件]';
            case 99: // 系统消息
                return '[系统消息]';
            default:
                return lastMessage;
        }
    };

    // 获取会话名称
    const getConversationName = (conversation) => {
        if (conversation.name) return conversation.name;

        if (conversation.type === 0) {
            return `用户${conversation.target_id}`;
        } else {
            return `群组${conversation.group_id || conversation.target_id}`;
        }
    };

    // 获取会话头像
    const getConversationAvatar = (conversation) => {
        if (conversation.avatar) return conversation.avatar;

        if (conversation.type === 0) {
            return '/default-avatar.png';
        } else {
            return '/default-group-avatar.png';
        }
    };

    // 加载更多
    const handleLoadMore = () => {
        if (hasMore && !loading) {
            fetchConversations(page + 1);
        }
    };

    // 刷新列表
    const handleRefresh = () => {
        fetchConversations(1, true);
    };

    // 监听WebSocket连接状态，连接成功时刷新列表
    useEffect(() => {
        if (connectionStatus === 'connected') {
            fetchConversations(1, true);
        }
    }, [connectionStatus, fetchConversations]);

    // 初始化获取会话列表
    useEffect(() => {
        fetchConversations(1);

        // 设置自动刷新间隔（每30秒检查一次新消息）
        const intervalId = setInterval(() => {
            if (connectionStatus === 'connected') {
                fetchConversations(1, true);
            }
        }, 30000);

        return () => clearInterval(intervalId);
    }, [fetchConversations, connectionStatus]);

    // 监听搜索词变化
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery.trim()) {
                filterConversations(conversations, activeTab, searchQuery, true);
            } else {
                filterConversations(conversations, activeTab, '', true);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, conversations, activeTab, filterConversations]);

    // 计算总未读消息数
    const totalUnreadCount = useMemo(() => {
        return conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
    }, [conversations]);

    // 渲染加载状态
    if (loading && conversations.length === 0) {
        return (
            <div className="chat-list-page">
                <div className="chat-list-header">
                    <h2>消息</h2>
                    <div className="chat-list-actions">
                        <button className="new-chat-btn" title="新建单聊">
                            💬
                        </button>
                        <button className="new-group-btn" title="新建群聊">
                            👥
                        </button>
                    </div>
                </div>

                <div className="chat-list-loading">
                    <div className="loading-spinner"></div>
                    <p>加载会话中...</p>
                </div>
            </div>
        );
    }

    // 渲染错误状态
    if (error && conversations.length === 0) {
        return (
            <div className="chat-list-page">
                <div className="chat-list-header">
                    <h2>消息</h2>
                </div>

                <div className="chat-list-error">
                    <div className="error-icon">⚠️</div>
                    <h3>{error}</h3>
                    <div className="error-actions">
                        <button
                            className="retry-btn"
                            onClick={handleRefresh}
                        >
                            重试
                        </button>
                        {connectionStatus !== 'connected' && (
                            <button
                                className="reconnect-btn"
                                onClick={reconnect}
                            >
                                重新连接
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-list-page">
            <div className="chat-list-header">
                <h2>消息</h2>
                <div className="chat-list-actions">
                    <button
                        className="new-chat-btn"
                        onClick={() => handleCreateConversation('single')}
                        title="新建单聊"
                    >
                        💬
                    </button>
                    <button
                        className="new-group-btn"
                        onClick={() => handleCreateConversation('group')}
                        title="新建群聊"
                    >
                        👥
                    </button>
                    <button
                        className="refresh-btn"
                        onClick={handleRefresh}
                        title="刷新"
                        disabled={refreshing}
                    >
                        {refreshing ? '🔄' : '🔄'}
                    </button>
                </div>
            </div>

            <div className="chat-list-search">
                <input
                    type="text"
                    placeholder="搜索会话..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="chat-search-input"
                />
            </div>

            <div className="chat-list-tabs">
                <button
                    className={`chat-tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => filterByType('all')}
                >
                    全部
                    {activeTab === 'all' && totalUnreadCount > 0 && (
                        <span className="tab-badge">{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</span>
                    )}
                </button>
                <button
                    className={`chat-tab ${activeTab === 'single' ? 'active' : ''}`}
                    onClick={() => filterByType('single')}
                >
                    单聊
                    {activeTab === 'single' && (
                        <span className="tab-badge">
                            {conversations.filter(c => c.type === 0).reduce((sum, c) => sum + (c.unread_count || 0), 0)}
                        </span>
                    )}
                </button>
                <button
                    className={`chat-tab ${activeTab === 'group' ? 'active' : ''}`}
                    onClick={() => filterByType('group')}
                >
                    群聊
                    {activeTab === 'group' && (
                        <span className="tab-badge">
                            {conversations.filter(c => c.type === 1).reduce((sum, c) => sum + (c.unread_count || 0), 0)}
                        </span>
                    )}
                </button>
            </div>

            <div className="chat-list-container">
                {filteredConversations.length === 0 ? (
                    <div className="empty-chat-list">
                        <div className="empty-icon">
                            {searchQuery ? '🔍' : '💬'}
                        </div>
                        <h3>
                            {searchQuery ? '未找到相关会话' : '还没有会话'}
                        </h3>
                        <p>
                            {searchQuery
                                ? '尝试搜索其他关键词'
                                : '开始和好友聊天吧！'
                            }
                        </p>
                        {!searchQuery && (
                            <button
                                className="start-chat-btn"
                                onClick={() => handleCreateConversation('single')}
                            >
                                发起聊天
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {filteredConversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                className={`chat-list-item ${conversation.unread_count > 0 ? 'unread' : ''}`}
                                onClick={() => {
                                    if (conversation.type === 0) {
                                        // 单聊
                                        navigate(`/chat/single/${conversation.target_id}`, {
                                            state: {
                                                conversationId: conversation.id,
                                                conversationName: conversation.name
                                            }
                                        });
                                    } else {
                                        // 群聊
                                        navigate(`/chat/group/${conversation.group_id || conversation.target_id}`, {
                                            state: {
                                                conversationId: conversation.id,
                                                conversationName: conversation.name
                                            }
                                        });
                                    }
                                }}
                            >
                                <div className="chat-item-avatar">
                                    <img
                                        src={getConversationAvatar(conversation)}
                                        alt={getConversationName(conversation)}
                                        className="avatar-img"
                                        onError={(e) => {
                                            e.target.src = conversation.type === 0 ? '/default-avatar.png' : '/default-group-avatar.png';
                                        }}
                                    />
                                    {conversation.type === 1 && (
                                        <span className="group-badge">群</span>
                                    )}
                                    {conversation.unread_count > 0 && (
                                        <span className="unread-dot"></span>
                                    )}
                                </div>

                                <div className="chat-item-content">
                                    <div className="chat-item-header">
                                        <h4 className="chat-item-name">
                                            {getConversationName(conversation)}
                                        </h4>
                                        <span className="chat-item-time">
                                            {formatTime(conversation.last_msg_time)}
                                        </span>
                                    </div>

                                    <div className="chat-item-preview">
                                        <span className="preview-icon">
                                            {getMessageTypeIcon(conversation.last_msg_type)}
                                        </span>
                                        <span className="preview-text">
                                            {getMessagePreview(conversation)}
                                        </span>
                                    </div>

                                    <div className="chat-item-footer">
                                        {conversation.type === 1 && conversation.member_count > 0 && (
                                            <span className="group-member-count">
                                                {conversation.member_count}人
                                            </span>
                                        )}
                                        {conversation.unread_count > 0 && (
                                            <span className="unread-badge">
                                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="chat-item-actions">
                                    <div className="action-dropdown">
                                        <button
                                            className="chat-action-btn"
                                            onClick={(e) => e.stopPropagation()}
                                            title="更多操作"
                                        >
                                            ⋮
                                        </button>
                                        <div className="action-menu">
                                            <button
                                                className="action-menu-item"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClearMessages(conversation.id, e);
                                                }}
                                            >
                                                🗑️ 清空记录
                                            </button>
                                            <button
                                                className="action-menu-item delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteConversation(conversation.id, e);
                                                }}
                                            >
                                                ❌ 删除会话
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {hasMore && (
                            <div className="load-more-container">
                                <button
                                    className="load-more-btn"
                                    onClick={handleLoadMore}
                                    disabled={loading}
                                >
                                    {loading ? '加载中...' : '加载更多'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="chat-list-bottom">
                <div className="connection-status">
                    <span className={`status-indicator ${connectionStatus}`}>
                        {connectionStatus === 'connected' ? '●' : '○'}
                    </span>
                    <span className="status-text">
                        {connectionStatus === 'connected' ? '已连接' :
                            connectionStatus === 'connecting' ? '连接中' : '未连接'}
                    </span>
                </div>
                <div className="unread-count-indicator">
                    未读消息: <strong>{totalUnreadCount}</strong>
                    {connectionStatus !== 'connected' && (
                        <button
                            className="reconnect-btn-small"
                            onClick={reconnect}
                        >
                            重连
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatList;