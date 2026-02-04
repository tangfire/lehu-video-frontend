// ChatRoom.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { messageApi } from '../../api/message';
import { userApi } from '../../api/user';
import { groupApi } from '../../api/group';
import { useWebSocket } from '../../components/WebSocket/WebSocketProvider';
import { useChat } from '../../context/chatContext';
import { getCurrentUser } from '../../api/user';
import './Chat.css';

const ChatRoom = () => {
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [targetInfo, setTargetInfo] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const params = useParams();
    const { type, targetId: paramTargetId } = params;
    const location = useLocation();
    const { conversationId: stateConversationId, conversation: initialConversation } = location.state || {};

    const messagesEndRef = useRef(null);
    const messageContainerRef = useRef(null);
    const currentUser = getCurrentUser();
    const navigate = useNavigate();
    const lastFetchRef = useRef(0);

    // WebSocket相关功能
    const {
        sendMessage: wsSendMessage,
        sendTypingStatus: wsSendTypingStatus,
        sendReadReceipt: wsSendReadReceipt,
        recallMessage: wsRecallMessage,
        isTyping: wsIsTyping,
        messageStatusUpdates
    } = useWebSocket();

    // 聊天上下文
    const {
        cacheConversation,
        cacheUser,
        cacheGroup,
        getCachedConversation,
        getCachedUser,
        getCachedGroup,
        shouldRefetch
    } = useChat();

    // 确定最终的conversationId
    const conversationId = stateConversationId;

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

    // 获取会话详情 - 优化版本
    const fetchConversationDetail = useCallback(async (force = false) => {
        if (!conversationId) {
            console.error('没有会话ID');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const cacheKey = `conv_${conversationId}`;

            // 检查是否需要重新获取
            const now = Date.now();
            if (!force && now - lastFetchRef.current < 1000) {
                console.log('跳过重复请求');
                setIsLoading(false);
                return;
            }

            lastFetchRef.current = now;

            // 先检查缓存
            const cached = getCachedConversation(conversationId);
            if (cached && !force) {
                console.log('使用缓存的会话信息');
                setConversation(cached);
                setIsLoading(false);
                return;
            }

            // 否则通过API获取
            console.log('正在获取会话详情，conversationId:', conversationId);
            const response = await messageApi.getConversationDetail(conversationId);
            console.log('获取到会话详情:', response);

            if (response && response.conversation) {
                setConversation(response.conversation);
                cacheConversation(response.conversation);
            }
        } catch (error) {
            console.error('获取会话详情失败:', error);
            setError('获取会话详情失败');
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, getCachedConversation, cacheConversation]);

    // 获取目标信息 - 优化版本
    const fetchTargetInfo = useCallback(async () => {
        if (!conversation) return;

        try {
            console.log('正在获取目标信息，conversation:', conversation);

            if (conversation.type === 0) { // 单聊
                const otherMemberId = conversation.member_ids?.find(
                    memberId => String(memberId) !== String(currentUser.id)
                );

                console.log('找到对方用户ID:', otherMemberId);

                if (!otherMemberId) {
                    setTargetInfo({
                        id: 'unknown',
                        name: conversation.name || `用户${paramTargetId}`,
                        avatar: conversation.avatar || '/default-avatar.png'
                    });
                    return;
                }

                // 检查缓存
                const cacheKey = `user_${otherMemberId}`;
                const cachedUser = getCachedUser(otherMemberId);
                if (cachedUser) {
                    console.log('使用缓存的用户信息');
                    setTargetInfo(cachedUser);
                    return;
                }

                // 检查是否需要重新获取
                if (!shouldRefetch(cacheKey, 30000)) {
                    console.log('跳过用户信息获取，缓存有效');
                    return;
                }

                try {
                    const userInfo = await userApi.getUserInfo(otherMemberId);
                    console.log('获取到用户信息:', userInfo);

                    if (userInfo && userInfo.user) {
                        const newTargetInfo = {
                            ...userInfo.user,
                            id: String(userInfo.user.id),
                            name: userInfo.user.nickname || userInfo.user.name || `用户${otherMemberId}`,
                            avatar: userInfo.user.avatar || '/default-avatar.png'
                        };

                        setTargetInfo(newTargetInfo);
                        cacheUser(newTargetInfo);
                    }
                } catch (error) {
                    console.error('获取用户信息失败:', error);
                    // 使用回退信息
                    setTargetInfo({
                        id: String(otherMemberId),
                        name: conversation.name || `用户${otherMemberId}`,
                        avatar: conversation.avatar || '/default-avatar.png'
                    });
                }
            } else { // 群聊
                const groupId = conversation.group_id || conversation.target_id;
                console.log('群聊ID:', groupId);

                if (!groupId) {
                    setTargetInfo({
                        id: 'unknown',
                        name: conversation.name || `群组${paramTargetId}`,
                        avatar: conversation.avatar || '/default-group-avatar.png'
                    });
                    return;
                }

                // 检查缓存
                const cacheKey = `group_${groupId}`;
                const cachedGroup = getCachedGroup(groupId);
                if (cachedGroup) {
                    console.log('使用缓存的群组信息');
                    setTargetInfo(cachedGroup);
                    return;
                }

                // 检查是否需要重新获取
                if (!shouldRefetch(cacheKey, 30000)) {
                    console.log('跳过群组信息获取，缓存有效');
                    return;
                }

                try {
                    const groupInfo = await groupApi.getGroupInfo(groupId);
                    console.log('获取到群组信息:', groupInfo);

                    if (groupInfo && groupInfo.group) {
                        const newTargetInfo = {
                            ...groupInfo.group,
                            id: String(groupInfo.group.id),
                            name: groupInfo.group.name || conversation.name || `群组${groupId}`,
                            avatar: groupInfo.group.avatar || conversation.avatar || '/default-group-avatar.png'
                        };

                        setTargetInfo(newTargetInfo);
                        cacheGroup(newTargetInfo);
                    }
                } catch (error) {
                    console.error('获取群组信息失败:', error);
                    setTargetInfo({
                        id: String(groupId),
                        name: conversation.name || `群组${groupId}`,
                        avatar: conversation.avatar || '/default-group-avatar.png'
                    });
                }
            }
        } catch (error) {
            console.error('获取目标信息失败:', error);
        }
    }, [conversation, currentUser, getCachedUser, getCachedGroup, cacheUser, cacheGroup, shouldRefetch, paramTargetId]);

    // 获取消息历史
    const fetchMessages = useCallback(async (pageNum = 1, referenceId = "0") => {
        if (!conversationId) return;

        try {
            if (pageNum === 1) {
                setIsLoading(true);
            } else {
                setLoadingMore(true);
            }

            const response = await messageApi.listMessages(
                conversationId,
                referenceId,
                20
            );

            if (response && response.messages) {
                const formattedMessages = (response.messages || []).map(msg => ({
                    ...msg,
                    id: String(msg.id),
                    sender_id: String(msg.sender_id),
                    receiver_id: String(msg.receiver_id),
                    conversation_id: String(msg.conversation_id),
                    status: msg.status || 0
                }));

                // ✅ 修复：历史消息加在前面，新消息在后面
                if (pageNum === 1) {
                    // 第一次加载，直接设置
                    setMessages(formattedMessages);
                } else {
                    // 加载更多历史消息，应该加在列表前面
                    setMessages(prev => {
                        const existingIds = new Set(formattedMessages.map(m => String(m.id)));
                        const existingMessages = prev.filter(m => !existingIds.has(String(m.id)));
                        return [...formattedMessages, ...existingMessages];
                    });
                }

                setHasMore(response.has_more || false);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('获取消息失败:', error);
        } finally {
            setIsLoading(false);
            setLoadingMore(false);
        }
    }, [conversationId]);

    // 从useWebSocket中获取新消息处理函数
    const { onMessage, offMessage } = useWebSocket();

// 监听新消息
    useEffect(() => {
        if (!conversationId) return;

        const handleNewMessage = (message) => {
            console.log('收到WebSocket新消息:', message);

            // 检查消息是否属于当前会话
            if (String(message.conversation_id) !== String(conversationId)) {
                return;
            }

            // 格式化消息
            const formattedMessage = {
                ...message,
                id: String(message.id),
                sender_id: String(message.sender_id),
                receiver_id: String(message.receiver_id),
                conversation_id: String(message.conversation_id),
                status: message.status || 1 // 默认已发送
            };

            // 检查是否已存在此消息
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => String(m.id)));
                if (existingIds.has(String(formattedMessage.id))) {
                    // 已存在，更新状态
                    return prev.map(m =>
                        String(m.id) === String(formattedMessage.id)
                            ? { ...m, ...formattedMessage }
                            : m
                    );
                } else {
                    // 新消息，添加到列表末尾
                    return [...prev, formattedMessage];
                }
            });

            // 滚动到底部
            setTimeout(scrollToBottom, 50);
        };

        // 注册监听器
        onMessage(handleNewMessage);

        // 清理函数
        return () => {
            offMessage(handleNewMessage);
        };
    }, [conversationId, onMessage, offMessage]);


    // 使用 useRef 来跟踪是否已经初始化
    const initializedRef = useRef(false);

    // 初始化会话 - 防抖版本
    const initializeConversation = useCallback(() => {
        if (!conversationId || initializedRef.current) return;

        initializedRef.current = true;

        // 优先使用传入的会话数据
        if (initialConversation && initialConversation.id === conversationId) {
            console.log('使用传入的会话信息:', initialConversation);
            setConversation(initialConversation);
            cacheConversation(initialConversation);

            // 立即获取消息，不使用 setTimeout
            fetchMessages(1, "0");
            return;
        }

        // 否则获取会话详情
        fetchConversationDetail();
    }, [conversationId, initialConversation, fetchConversationDetail, cacheConversation, fetchMessages]);

    // 在组件卸载时重置初始化状态
    useEffect(() => {
        return () => {
            initializedRef.current = false;
        };
    }, []);

    // 初始化
    useEffect(() => {
        initializeConversation();
    }, [initializeConversation]);

    // 监听conversation变化，获取目标信息
    useEffect(() => {
        if (!conversation) return;

        // 防抖获取目标信息
        const timeoutId = setTimeout(() => {
            fetchTargetInfo();
        }, 200);

        // 如果conversation变化，获取消息
        if (!messages.length) {
            fetchMessages(1, "0");
        }

        return () => clearTimeout(timeoutId);
    }, [conversation, fetchTargetInfo, fetchMessages, messages.length]);

    // WebSocket状态更新处理
    useEffect(() => {
        if (messageStatusUpdates.size === 0) return;

        let hasChanges = false;
        const updatedMessages = messages.map(msg => {
            const update = messageStatusUpdates.get(String(msg.id));
            if (!update) return msg;

            const newMsg = { ...msg };

            // 处理ID升级
            if (String(msg.id).startsWith('temp_') && update.message_id) {
                newMsg.id = String(update.message_id);
                hasChanges = true;
            }

            // 处理状态更新
            if (update.status !== undefined && newMsg.status !== update.status) {
                newMsg.status = update.status;
                hasChanges = true;
            }

            return newMsg;
        });

        if (hasChanges) {
            setMessages(updatedMessages);
        }
    }, [messageStatusUpdates, messages]);

    // 滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(scrollToBottom, 100);
        }
    }, [messages]);

    // 发送消息
    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !currentUser || !conversation) {
            console.error('发送消息条件不满足:', { inputMessage, currentUser, conversation });
            return;
        }

        // 生成客户端消息ID
        const clientMsgId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // 临时消息
        const tempMessage = {
            id: clientMsgId,
            sender_id: String(currentUser.id),
            receiver_id: String(receiverId),
            conversation_id: String(conversationId),
            conv_type: convType,
            msg_type: 0,
            content: { text: inputMessage.trim() },
            status: 0, // 发送中
            is_recalled: false,
            created_at: new Date().toISOString(),
            is_temp: true // 标记为临时消息
        };

        console.log('添加临时消息:', tempMessage);
        setMessages(prev => [...prev, tempMessage]); // 添加到末尾
        setInputMessage('');

        // 立即滚动到底部
        setTimeout(scrollToBottom, 50);

        // 通过WebSocket发送
        const success = wsSendMessage(messagePayload);
        if (!success) {
            console.error('WebSocket发送失败');
            // 标记为发送失败
            setMessages(prev => prev.map(msg =>
                msg.id === clientMsgId ? { ...msg, status: 99 } : msg
            ));
        }
    };

    // 处理输入变化
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputMessage(value);
    };

    // 处理按键事件
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // 撤回消息
    const handleRecallMessage = async (messageId) => {
        try {
            const success = wsRecallMessage(messageId);
            if (success) {
                setMessages(prev =>
                    prev.map(msg =>
                        String(msg.id) === String(messageId)
                            ? { ...msg, is_recalled: true, status: 4 }
                            : msg
                    )
                );
            }
        } catch (error) {
            console.error('撤回消息失败:', error);
        }
    };

    // 加载更多消息
    const handleLoadMore = useCallback(() => {
        if (hasMore && !loadingMore && messages.length > 0) {
            const lastMsgId = messages[0]?.id || "0";
            console.log('加载更多消息，lastMsgId:', lastMsgId);
            fetchMessages(page + 1, lastMsgId);
        }
    }, [hasMore, loadingMore, messages, page, fetchMessages]);

    // 处理滚动
    const handleScroll = () => {
        if (messageContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
            // 当滚动到顶部时加载更多
            if (scrollTop < 100 && hasMore && !loadingMore) {
                handleLoadMore();
            }
        }
    };

    // 格式化时间
    const formatTime = (timestamp) => {
        try {
            let date;
            if (typeof timestamp === 'string') {
                date = new Date(timestamp);
            } else if (typeof timestamp === 'number') {
                const msTimestamp = timestamp < 1000000000000 ? timestamp * 1000 : timestamp;
                date = new Date(msTimestamp);
            } else {
                return '';
            }

            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            console.error('格式化时间错误:', error);
            return '';
        }
    };

    // 获取消息状态文本
    const getStatusText = (status) => {
        switch (status) {
            case 0: return '发送中';
            case 1: return '已发送';
            case 2: return '已送达';
            case 3: return '已读';
            case 4: return '已撤回';
            case 99: return '发送失败';
            default: return '';
        }
    };

    // 重新获取会话信息
    const handleRetry = () => {
        setError(null);
        fetchConversationDetail(true);
    };

    // 检查对方是否正在输入
    const isTargetTyping = useMemo(() => {
        if (!targetInfo || !conversation) return false;

        const typingKey = `${String(targetInfo.id)}_${String(conversation.id)}`;
        return wsIsTyping && wsIsTyping(String(targetInfo.id), String(conversation.id));
    }, [targetInfo, conversation, wsIsTyping]);

    // 如果没有conversationId，显示错误
    if (!conversationId) {
        return (
            <div className="chat-room-error">
                <div className="error-icon">⚠️</div>
                <h3>无法加载聊天</h3>
                <p>缺少会话ID，请返回重新进入</p>
                <div className="error-actions">
                    <button onClick={() => navigate(-1)}>返回</button>
                    <button onClick={() => navigate('/chat')}>会话列表</button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chat-room-error">
                <div className="error-icon">⚠️</div>
                <h3>加载失败</h3>
                <p>{error}</p>
                <div className="error-actions">
                    <button onClick={handleRetry}>重试</button>
                    <button onClick={() => navigate(-1)}>返回</button>
                </div>
            </div>
        );
    }

    console.log('当前状态:', {
        isLoading,
        messagesCount: messages.length,
        hasMore,
        loadingMore,
        conversation: conversation ? '已加载' : '未加载',
        targetInfo: targetInfo ? '已加载' : '未加载',
        isTargetTyping
    });

    return (
        <div className="chat-room">
            <div className="chat-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    ←
                </button>
                <div className="chat-header-info">
                    {targetInfo ? (
                        <>
                            <img
                                src={targetInfo.avatar || (conversation?.type === 0 ? '/default-avatar.png' : '/default-group-avatar.png')}
                                alt={targetInfo.name}
                                className="chat-header-avatar"
                                onError={(e) => {
                                    e.target.src = conversation?.type === 0 ? '/default-avatar.png' : '/default-group-avatar.png';
                                }}
                            />
                            <div className="chat-header-details">
                                <h3>{targetInfo.name}</h3>
                                <p className="chat-status">
                                    {conversation?.type === 1 ?
                                        `成员: ${conversation.member_count || 0}` :
                                        '在线'}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="chat-header-details">
                            <h3>
                                {conversation?.type === 0 ?
                                    `用户${paramTargetId || '加载中'}` :
                                    `群组${paramTargetId || '加载中'}`
                                }
                            </h3>
                            <p className="chat-status">加载中...</p>
                        </div>
                    )}
                </div>
                <div className="chat-header-actions">
                    <button className="chat-action-btn">
                        <span>···</span>
                    </button>
                </div>
            </div>

            <div
                className="chat-messages-container"
                ref={messageContainerRef}
                onScroll={handleScroll}
            >
                {hasMore && messages.length > 0 && (
                    <div className="load-more-container">
                        <button
                            className="load-more-btn"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? '加载中...' : '加载更多消息'}
                        </button>
                    </div>
                )}

                <div className="chat-messages">
                    {isLoading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>加载消息中...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="no-messages">
                            <div className="no-messages-icon">💬</div>
                            <p>还没有消息，开始聊天吧！</p>
                        </div>
                    ) : (
                        messages.map((message) => {
                            const displayStatus = message.status;

                            return (
                                <div
                                    key={message.id}
                                    className={`message-item ${
                                        String(message.sender_id) === String(currentUser.id) ? 'sent' : 'received'
                                    } ${message.is_recalled ? 'recalled' : ''}`}
                                >
                                    {message.is_recalled ? (
                                        <div className="message-content">
                                            <p className="message-text recall-text">消息已被撤回</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="message-content">
                                                {message.content?.text && (
                                                    <p className="message-text">{message.content.text}</p>
                                                )}
                                                {message.content?.image_url && (
                                                    <img
                                                        src={message.content.image_url}
                                                        alt="消息图片"
                                                        className="message-image"
                                                    />
                                                )}
                                                {message.content?.voice_url && (
                                                    <div className="message-voice">
                                                        <audio controls src={message.content.voice_url} />
                                                        <span>{message.content.voice_duration}s</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="message-meta">
                                                <span className="message-time">
                                                    {formatTime(message.created_at)}
                                                </span>
                                                {String(message.sender_id) === String(currentUser.id) && (
                                                    <span className={`message-status status-${displayStatus}`}>
                                                        {getStatusText(displayStatus)}
                                                    </span>
                                                )}
                                            </div>
                                            {String(message.sender_id) === String(currentUser.id) &&
                                                !message.is_recalled &&
                                                displayStatus !== 4 && (
                                                    <button
                                                        className="message-recall-btn"
                                                        onClick={() => handleRecallMessage(message.id)}
                                                        title="撤回消息"
                                                    >
                                                        撤回
                                                    </button>
                                                )}
                                        </>
                                    )}
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {isTargetTyping && (
                    <div className="typing-indicator">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-text">对方正在输入...</span>
                    </div>
                )}
            </div>

            <div className="chat-input-container">
                <div className="chat-input-tools">
                    <button className="chat-tool-btn" title="表情">
                        😊
                    </button>
                    <button className="chat-tool-btn" title="图片">
                        📷
                    </button>
                    <button className="chat-tool-btn" title="文件">
                        📎
                    </button>
                </div>
                <textarea
                    className="chat-input"
                    placeholder="输入消息..."
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    rows={3}
                />
                <button
                    className="chat-send-btn"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                >
                    发送
                </button>
            </div>
        </div>
    );
};

export default ChatRoom;