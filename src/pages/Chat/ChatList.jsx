// ChatList.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { messageApi } from '../../api/message';
import { useWebSocket } from '../../components/WebSocket/WebSocketProvider';
import { useChat } from '../../context/chatContext';
import { getCurrentUser } from '../../api/user';
import { logger } from '../../utils/logger';
import './Chat.css';

const ChatList = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const navigate = useNavigate();

    const currentUser = getCurrentUser();
    // ✅ 从 useWebSocket 中取出 onMessage 和 offMessage
    const { connectionStatus, reconnect, onMessage, offMessage } = useWebSocket();
    const { cacheConversation, getCachedConversation } = useChat();

    // 使用 ref 来存储请求状态和定时器
    const fetchTimeoutRef = useRef(null);
    const isFetchingRef = useRef(false);
    const lastFetchTimeRef = useRef(0);

    const showNotice = useCallback((type, text) => {
        setNotice({ type, text });
        window.setTimeout(() => setNotice(null), 3000);
    }, []);

    // 防抖函数
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // 过滤和搜索会话
    const filterConversations = useCallback((convs, tab, query, replace = false) => {
        let filtered = [...convs];

        if (tab === 'single') {
            filtered = filtered.filter(conv => conv.type === 0);
        } else if (tab === 'group') {
            filtered = filtered.filter(conv => conv.type === 1);
        }

        if (query.trim()) {
            const searchStr = query.toLowerCase();
            filtered = filtered.filter(conv => {
                const name = conv.name ? conv.name.toLowerCase() : '';
                const lastMessage = conv.last_message ? conv.last_message.toLowerCase() : '';
                const targetId = conv.target_id ? String(conv.target_id).toLowerCase() : '';

                return name.includes(searchStr) ||
                    lastMessage.includes(searchStr) ||
                    targetId.includes(searchStr);
            });
        }

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

    // 获取会话列表 - 防抖版本
    const fetchConversations = useCallback(async (pageNum = 1, isRefresh = false) => {
        // 防抖处理：取消之前的请求
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        // 防重处理：如果正在请求，则跳过
        if (isFetchingRef.current && !isRefresh) {
            return;
        }

        const now = Date.now();
        // 防刷处理：1秒内不重复请求（除非是手动刷新）
        if (!isRefresh && now - lastFetchTimeRef.current < 1000) {
            return;
        }

        // 设置请求状态
        isFetchingRef.current = true;
        lastFetchTimeRef.current = now;

        try {
            if (isRefresh) {
                setRefreshing(true);
            } else if (pageNum === 1) {
                setLoading(true);
            }

            setError(null);

            const response = await messageApi.listConversations({
                page: pageNum,
                page_size: 20
            });

            if (response && response.conversations) {
                const formattedConversations = response.conversations.map(conv => {
                    let conversationName = conv.name;
                    let targetInfo = {};

                    if (conv.type === 0) {
                        const otherMemberId = conv.member_ids?.find(
                            memberId => String(memberId) !== String(currentUser.id)
                        );

                        if (otherMemberId) {
                            targetInfo = {
                                id: String(otherMemberId),
                                type: 'user'
                            };

                            if (!conversationName) {
                                conversationName = `用户${otherMemberId}`;
                            }
                        }
                    } else {
                        const groupId = conv.group_id || conv.target_id;
                        targetInfo = {
                            id: String(groupId),
                            type: 'group'
                        };

                        if (!conversationName) {
                            conversationName = `群聊${groupId}`;
                        }
                    }

                    const formattedConv = {
                        ...conv,
                        id: String(conv.id),
                        target_id: String(conv.target_id),
                        group_id: conv.group_id ? String(conv.group_id) : '',
                        member_count: Number(conv.member_count || 0),
                        unread_count: Number(conv.unread_count || 0),
                        member_ids: conv.member_ids?.map(id => String(id)) || [],
                        name: conversationName,
                        targetInfo
                    };

                    cacheConversation(formattedConv);

                    return formattedConv;
                });

                if (pageNum === 1) {
                    setConversations(formattedConversations);
                } else {
                    setConversations(prev => {
                        const existingIds = new Set(prev.map(c => String(c.id)));
                        const newConvs = formattedConversations.filter(
                            c => !existingIds.has(String(c.id))
                        );
                        return [...prev, ...newConvs];
                    });
                }

                setHasMore(response.page_stats?.has_next || false);
                setPage(pageNum);
                filterConversations(formattedConversations, activeTab, searchQuery, pageNum === 1);
            } else {
                setConversations([]);
                setFilteredConversations([]);
            }
        } catch (error) {
            logger.warn('获取会话列表失败:', error);
            // 如果不是取消请求的错误，才显示错误信息
            if (error.message !== '重复请求已取消') {
                setError('获取会话列表失败，请检查网络连接');
            }
            if (error.response?.status === 401) {
                setError('请先登录');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
            isFetchingRef.current = false;
        }
    }, [activeTab, searchQuery, currentUser.id, filterConversations, cacheConversation]);

    // 防抖搜索
    const debouncedSearch = useCallback(
        debounce((query) => {
            setSearchQuery(query);
            filterConversations(conversations, activeTab, query, true);
        }, 300),
        [conversations, activeTab, filterConversations]
    );

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

            setConversations(prev => prev.filter(conv => conv.id !== conversationId));
            setFilteredConversations(prev => prev.filter(conv => conv.id !== conversationId));

        } catch (error) {
            logger.warn('删除会话失败:', error);
            showNotice('error', '删除失败，请重试');
        }
    };

    // 创建新会话
    const handleCreateConversation = async (type = 'single') => {
        const promptText = type === 'single' ? '请输入好友ID：' : '请输入群组ID：';
        const targetId = prompt(promptText);

        if (!targetId?.trim()) return;

        try {
            const response = await messageApi.createConversation(
                targetId.trim(),
                type === 'single' ? 0 : 1,
                type === 'single' ? '你好，我们开始聊天吧！' : '大家好！'
            );

            if (response && response.conversation_id) {
                try {
                    const convDetail = await messageApi.getConversationDetail(response.conversation_id);
                    if (convDetail?.conversation) {
                        cacheConversation(convDetail.conversation);
                    }
                } catch (e) {
                    logger.warn('获取会话详情失败，但创建成功:', e);
                }

                fetchConversations(1, true);

                navigate(`/chat/${type}/${targetId}`, {
                    state: {
                        conversationId: response.conversation_id,
                        conversation: {
                            id: response.conversation_id,
                            type: type === 'single' ? 0 : 1,
                            target_id: targetId
                        }
                    },
                    replace: true
                });
            }
        } catch (error) {
            logger.warn('创建会话失败:', error);
            const errorMsg = type === 'single'
                ? '创建会话失败，请检查好友关系或网络连接'
                : '创建会话失败，请检查是否已加入该群';
            showNotice('error', errorMsg);
        }
    };

    // 点击会话跳转
    const handleConversationClick = useCallback((conversation) => {
        if (conversation.type === 0) {
            const otherMemberId = conversation.member_ids?.find(
                memberId => String(memberId) !== String(currentUser.id)
            );

            if (otherMemberId) {
                const cachedConv = getCachedConversation(conversation.id);
                const conversationData = cachedConv || conversation;

                navigate(`/chat/single/${otherMemberId}`, {
                    state: {
                        conversationId: conversation.id,
                        conversation: conversationData
                    },
                    replace: true
                });
            } else {
                showNotice('error', '无法开始聊天：未找到对方用户');
            }
        } else {
            const groupId = conversation.group_id || conversation.target_id;
            if (groupId) {
                const cachedConv = getCachedConversation(conversation.id);
                const conversationData = cachedConv || conversation;

                navigate(`/chat/group/${groupId}`, {
                    state: {
                        conversationId: conversation.id,
                        conversation: conversationData
                    },
                    replace: true
                });
            } else {
                showNotice('error', '无法开始聊天：未找到群组');
            }
        }
    }, [navigate, currentUser, getCachedConversation, showNotice]);

    // 清空聊天记录
    const handleClearMessages = async (conversationId, e) => {
        if (e) e.stopPropagation();

        if (!window.confirm('确定要清空这个会话的聊天记录吗？此操作不可恢复。')) {
            return;
        }

        try {
            await messageApi.clearMessages(conversationId);
            showNotice('success', '聊天记录已清空');

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
            logger.warn('清空聊天记录失败:', error);
            showNotice('error', '清空失败，请重试');
        }
    };

    // 格式化时间
    const formatTime = (timestamp) => {
        if (!timestamp || timestamp === 0) return '';

        try {
            const msTimestamp = timestamp < 1000000000000 ? timestamp * 1000 : timestamp;
            const date = new Date(msTimestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                return '昨天';
            } else if (diffDays < 7) {
                const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                return days[date.getDay()];
            } else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        } catch (error) {
            logger.warn('格式化时间错误:', error);
            return '';
        }
    };

    // 获取消息类型图标
    const getMessageTypeIcon = (msgType) => {
        switch (msgType) {
            case 0: return '💬';
            case 1: return '🖼️';
            case 2: return '🎵';
            case 3: return '🎬';
            case 4: return '📎';
            case 99: return '📢';
            default: return '💬';
        }
    };

    // 获取消息预览文本
    const getMessagePreview = (conversation) => {
        if (!conversation.last_message) return '暂无消息';

        const lastMessage = conversation.last_message;

        switch (conversation.last_msg_type) {
            case 0:
                return lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage;
            case 1: return '[图片]';
            case 2: return '[语音消息]';
            case 3: return '[视频]';
            case 4: return '[文件]';
            case 99: return '[系统消息]';
            default: return lastMessage;
        }
    };

    // 获取会话名称
    const getConversationName = (conversation) => {
        if (conversation.name && conversation.name.trim()) return conversation.name;

        if (conversation.type === 0) {
            return `用户${conversation.target_id}`;
        } else {
            return `群组${conversation.group_id || conversation.target_id}`;
        }
    };

    // 获取会话头像
    const getConversationAvatar = (conversation) => {
        if (conversation.avatar && conversation.avatar.trim()) return conversation.avatar;

        if (conversation.type === 0) {
            return '/default-avatar.png';
        } else {
            return '/default-group-avatar.png';
        }
    };

    // 加载更多
    const handleLoadMore = () => {
        if (hasMore && !loading && !refreshing) {
            fetchConversations(page + 1);
        }
    };

    // 刷新列表
    const handleRefresh = () => {
        if (!refreshing) {
            fetchConversations(1, true);
        }
    };

    // 监听搜索输入
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };

    // ========== 正确监听 WebSocket 新消息 ==========
    useEffect(() => {
        const handleNewMessage = (message) => {
            // 提取消息数据（兼容两种结构）
            const data = message.data || message;
            if (!data.conversation_id) return;

            const conversationId = String(data.conversation_id);
            const senderId = String(data.sender_id || '');
            const currentUserId = String(currentUser?.id || '');

            // 构造预览文本
            let lastMessage = data.content?.text || '';
            if (data.msg_type === 1) lastMessage = '[图片]';
            else if (data.msg_type === 2) lastMessage = '[语音]';
            else if (data.msg_type === 3) lastMessage = '[视频]';
            else if (data.msg_type === 4) lastMessage = '[文件]';

            const lastMsgTime = data.created_at ? new Date(data.created_at).getTime() : Date.now();

            // 更新 conversations 状态
            setConversations(prev => {
                const index = prev.findIndex(c => String(c.id) === conversationId);
                if (index === -1) return prev; // 新会话由 fetch 处理

                const updated = { ...prev[index] };
                updated.last_message = lastMessage;
                updated.last_msg_time = lastMsgTime;
                // 不是自己发送的消息才增加未读计数
                if (senderId !== currentUserId) {
                    updated.unread_count = (updated.unread_count || 0) + 1;
                }

                const newList = [...prev];
                newList[index] = updated;
                newList.sort((a, b) => (b.last_msg_time || 0) - (a.last_msg_time || 0));
                return newList;
            });

            // 同步更新 filteredConversations
            setFilteredConversations(prev => {
                const index = prev.findIndex(c => String(c.id) === conversationId);
                if (index === -1) return prev;

                const updated = { ...prev[index] };
                updated.last_message = lastMessage;
                updated.last_msg_time = lastMsgTime;
                if (senderId !== currentUserId) {
                    updated.unread_count = (updated.unread_count || 0) + 1;
                }

                const newFiltered = [...prev];
                newFiltered[index] = updated;
                newFiltered.sort((a, b) => (b.last_msg_time || 0) - (a.last_msg_time || 0));
                return newFiltered;
            });
        };

        // 注册回调（不需要事件名）
        onMessage(handleNewMessage);

        return () => {
            offMessage(handleNewMessage);
        };
    }, [onMessage, offMessage, currentUser]); // 注意依赖

    // 监听WebSocket连接状态
    useEffect(() => {
        if (connectionStatus === 'connected') {
            // 使用防抖延迟获取，避免频繁请求
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
            fetchTimeoutRef.current = setTimeout(() => {
                fetchConversations(1, true);
            }, 500);
        }
    }, [connectionStatus, fetchConversations]);

    // 初始化获取会话列表
    useEffect(() => {
        // 使用防抖延迟初始化
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }
        fetchTimeoutRef.current = setTimeout(() => {
            fetchConversations(1);
        }, 300);

        // 清理定时器
        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, [fetchConversations]);

    // 计算总未读消息数
    const totalUnreadCount = React.useMemo(() => {
        return conversations.reduce((total, conv) => total + (Number(conv.unread_count) || 0), 0);
    }, [conversations]);

    if (loading && conversations.length === 0) {
        return (
            <div className="chat-list-page">
                <div className="chat-list-header">
                    <h2>消息</h2>
                </div>
                <div className="chat-list-loading">
                    <div className="loading-spinner"></div>
                    <p>加载会话中...</p>
                </div>
            </div>
        );
    }

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
                        <button className="retry-btn" onClick={handleRefresh}>
                            重试
                        </button>
                        {connectionStatus !== 'connected' && (
                            <button className="reconnect-btn" onClick={reconnect}>
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
            {notice && (
                <div className={`chat-list-notice ${notice.type}`}>
                    {notice.text}
                </div>
            )}

            <div className="chat-list-header">
                <h2>消息</h2>
                <div className="chat-list-actions">
                    <button
                        className="new-chat-btn"
                        onClick={() => handleCreateConversation('single')}
                        title="新建单聊"
                        disabled={refreshing}
                    >
                        💬
                    </button>
                    <button
                        className="new-group-btn"
                        onClick={() => handleCreateConversation('group')}
                        title="新建群聊"
                        disabled={refreshing}
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
                    onChange={handleSearchChange}
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
                            {conversations.filter(c => c.type === 0).reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0)}
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
                            {conversations.filter(c => c.type === 1).reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0)}
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
                                onClick={() => handleConversationClick(conversation)}
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
                                    disabled={loading || refreshing}
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
