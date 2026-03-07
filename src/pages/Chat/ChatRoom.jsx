// ChatRoom.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { messageApi } from '../../api/message';
import { userApi } from '../../api/user';
import { groupApi } from '../../api/group';
import { friendApi } from '../../api/friend';
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
    const [showDebugInfo, setShowDebugInfo] = useState(false);
    const [targetOnline, setTargetOnline] = useState(false);

    const [localConversationId, setLocalConversationId] = useState('');

    const params = useParams();
    const { type, targetId: paramTargetId } = params;
    const location = useLocation();
    const { conversationId: stateConversationId, conversation: initialConversation } = location.state || {};

    const messagesEndRef = useRef(null);
    const messageContainerRef = useRef(null);
    const currentUser = getCurrentUser();
    const navigate = useNavigate();
    const lastFetchRef = useRef(0);
    const initializedRef = useRef(false);
    const pendingMessagesRef = useRef(new Map());
    const onlineTimerRef = useRef(null);

    const {
        sendMessage: wsSendMessage,
        sendTypingStatus: wsSendTypingStatus,
        sendReadReceipt: wsSendReadReceipt,
        recallMessage: wsRecallMessage,
        messageStatusUpdates,
        onMessage,
        offMessage,
        isConnected,
        connectionStatus, // 直接从 useWebSocket 获取
        reconnect
    } = useWebSocket();

    const {
        cacheConversation,
        cacheUser,
        cacheGroup,
        getCachedConversation,
        getCachedUser,
        getCachedGroup
    } = useChat();

    // ========== 初始化会话ID ==========
    useEffect(() => {
        if (stateConversationId) {
            setLocalConversationId(stateConversationId);
        }
    }, [stateConversationId]);

    useEffect(() => {
        const fetchOrCreateConversationId = async () => {
            if (!type || !paramTargetId) return;
            if (localConversationId) return;
            try {
                setIsLoading(true);
                const response = await messageApi.createConversation(
                    paramTargetId,
                    type === 'single' ? 0 : 1,
                    ''
                );
                if (response && response.conversation_id) {
                    setLocalConversationId(response.conversation_id);
                } else {
                    throw new Error('创建会话失败');
                }
            } catch (error) {
                console.error('获取会话ID失败', error);
                setError('无法获取会话信息，请重试');
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrCreateConversationId();
    }, [type, paramTargetId, localConversationId]);

    // 获取会话详情
    const fetchConversationDetail = useCallback(async (force = false) => {
        if (!localConversationId) {
            console.error('没有会话ID');
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const now = Date.now();
            if (!force && now - lastFetchRef.current < 1000) {
                console.log('跳过重复请求');
                setIsLoading(false);
                return;
            }
            lastFetchRef.current = now;
            const cached = getCachedConversation(localConversationId);
            if (cached && !force) {
                console.log('使用缓存的会话信息');
                setConversation(cached);
                setIsLoading(false);
                return;
            }
            console.log('正在获取会话详情，conversationId:', localConversationId);
            const response = await messageApi.getConversationDetail(localConversationId);
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
    }, [localConversationId, getCachedConversation, cacheConversation]);

    // 获取目标信息
    const fetchTargetInfo = useCallback(async () => {
        if (!conversation) return;
        try {
            console.log('正在获取目标信息，conversation:', conversation);
            if (conversation.type === 0) {
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
                const cachedUser = getCachedUser(otherMemberId);
                if (cachedUser) {
                    console.log('使用缓存的用户信息');
                    setTargetInfo(cachedUser);
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
                    setTargetInfo({
                        id: String(otherMemberId),
                        name: conversation.name || `用户${otherMemberId}`,
                        avatar: conversation.avatar || '/default-avatar.png'
                    });
                }
            } else {
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
                const cachedGroup = getCachedGroup(groupId);
                if (cachedGroup) {
                    console.log('使用缓存的群组信息');
                    setTargetInfo(cachedGroup);
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
    }, [conversation, currentUser, getCachedUser, getCachedGroup, cacheUser, cacheGroup, paramTargetId]);

    // 获取目标在线状态
    const fetchTargetOnlineStatus = useCallback(async () => {
        if (conversation?.type === 0 && targetInfo?.id) {
            try {
                const res = await friendApi.getUserOnlineStatus(targetInfo.id);
                const status = res?.onlineStatus ?? res?.online_status ?? res?.status ?? 0;
                setTargetOnline(status === 1);
            } catch (error) {
                console.error('获取目标在线状态失败', error);
            }
        }
    }, [conversation, targetInfo]);

    // 启动轮询
    useEffect(() => {
        if (conversation?.type === 0 && targetInfo?.id) {
            fetchTargetOnlineStatus();
            onlineTimerRef.current = setInterval(fetchTargetOnlineStatus, 30000);
            return () => clearInterval(onlineTimerRef.current);
        }
    }, [conversation, targetInfo, fetchTargetOnlineStatus]);

    // 获取消息历史
    const fetchMessages = useCallback(async (pageNum = 1, referenceId = "0") => {
        if (!localConversationId) {
            console.error('没有会话ID，无法获取消息');
            return;
        }
        try {
            console.log('正在获取消息，参数:', { localConversationId, pageNum, referenceId });
            if (pageNum === 1) {
                setIsLoading(true);
            } else {
                setLoadingMore(true);
            }
            const response = await messageApi.listMessages(
                localConversationId,
                referenceId,
                20
            );
            console.log('消息API响应:', response);
            if (!response || !response.messages) {
                console.error('获取消息返回格式错误:', response);
                return;
            }
            const formattedMessages = (response.messages || []).map(msg => ({
                ...msg,
                id: String(msg.id),
                sender_id: String(msg.sender_id),
                receiver_id: String(msg.receiver_id),
                conversation_id: String(msg.conversation_id),
                status: msg.status || 0
            }));
            console.log('格式化后的消息:', formattedMessages);
            if (pageNum === 1) {
                setMessages(formattedMessages);
            } else {
                setMessages(prev => {
                    const existingIds = new Set(formattedMessages.map(m => String(m.id)));
                    const existingMessages = prev.filter(m => !existingIds.has(String(m.id)));
                    return [...formattedMessages, ...existingMessages];
                });
            }
            setHasMore(response.has_more || false);
            setPage(pageNum);
        } catch (error) {
            console.error('获取消息失败:', error);
        } finally {
            setIsLoading(false);
            setLoadingMore(false);
        }
    }, [localConversationId]);

    // 初始化会话
    const initializeConversation = useCallback(() => {
        if (!localConversationId || initializedRef.current) return;
        initializedRef.current = true;
        if (initialConversation && initialConversation.id === localConversationId) {
            console.log('使用传入的会话信息:', initialConversation);
            setConversation(initialConversation);
            cacheConversation(initialConversation);
            fetchMessages(1, "0");
            return;
        }
        fetchConversationDetail();
    }, [localConversationId, initialConversation, fetchConversationDetail, cacheConversation, fetchMessages]);

    // WebSocket 消息处理
    const handleNewMessage = useCallback((message) => {
        const formattedMessage = {
            ...message.data || message,
            id: String(message.data?.id || message.id || message.message_id),
            sender_id: String(message.data?.sender_id || message.sender_id),
            receiver_id: String(message.data?.receiver_id || message.receiver_id),
            conversation_id: String(message.data?.conversation_id || message.conversation_id),
            status: message.data?.status || message.status || 2,
            created_at: message.data?.created_at || message.created_at || new Date().toISOString()
        };
        console.log('📝 格式化后的新消息:', formattedMessage);
        setMessages(prev => {
            const existingIds = new Set(prev.map(m => String(m.id)));
            if (existingIds.has(String(formattedMessage.id))) {
                console.log('🔄 消息已存在，更新状态');
                return prev.map(m =>
                    String(m.id) === String(formattedMessage.id)
                        ? { ...m, ...formattedMessage }
                        : m
                );
            } else {
                console.log('➕ 添加新消息到列表');
                return [...prev, formattedMessage];
            }
        });
        setTimeout(scrollToBottom, 50);
        if (String(formattedMessage.sender_id) !== String(currentUser?.id)) {
            wsSendReadReceipt(localConversationId, formattedMessage.id);
        }
    }, [localConversationId, currentUser, wsSendReadReceipt]);

    const handleMessageSent = useCallback((message) => {
        console.log('✅ 消息发送成功:', message);
        const data = message.data || message;
        const tempId = data.client_msg_id;
        const serverId = data.message_id;
        if (tempId && serverId) {
            setMessages(prev => prev.map(msg => {
                if (msg.id === tempId || msg.client_msg_id === tempId) {
                    return {
                        ...msg,
                        id: String(serverId),
                        status: 1,
                        message_id: String(serverId)
                    };
                }
                return msg;
            }));
        }
    }, []);

    const handleMessageDelivered = useCallback((message) => {
        console.log('📨 消息已送达:', message);
        const data = message.data || message;
        const messageId = data.message_id;
        if (messageId) {
            setMessages(prev => prev.map(msg => {
                if (String(msg.id) === String(messageId)) {
                    return { ...msg, status: 2 };
                }
                return msg;
            }));
        }
    }, []);

    const handleMessageRead = useCallback((message) => {
        console.log('👁️ 消息已读:', message);
        const data = message.data || message;
        const messageId = data.message_id;
        if (messageId) {
            setMessages(prev => prev.map(msg => {
                if (String(msg.id) === String(messageId)) {
                    return { ...msg, status: 3 };
                }
                return msg;
            }));
        }
    }, []);

    const handleMessageRecalled = useCallback((message) => {
        console.log('↩️ 消息撤回:', message);
        const data = message.data || message;
        const messageId = data.message_id;
        if (messageId) {
            setMessages(prev => prev.map(msg => {
                if (String(msg.id) === String(messageId)) {
                    return { ...msg, is_recalled: true, status: 4 };
                }
                return msg;
            }));
        }
    }, []);

    const handleUserTyping = useCallback((message) => {
        console.log('⌨️ 用户正在输入:', message);
    }, []);

    const handleWebSocketMessage = useCallback((message) => {
        const data = message.data || message;
        console.log('🎯 收到WebSocket新消息:', {
            message,
            data,
            currentConversationId: localConversationId,
            messageConversationId: data.conversation_id || data.conversationId,
            type: data.type || 'unknown'
        });
        const messageConvId = data.conversation_id || data.conversationId;
        const currentConvId = localConversationId;
        const isCurrentConversation =
            (messageConvId && currentConvId && String(messageConvId) === String(currentConvId)) ||
            (!messageConvId && String(data.receiver_id) === String(currentUser?.id)) ||
            (!messageConvId && String(data.sender_id) === String(paramTargetId)) ||
            data.type === 'system' ||
            message.action === 'message_recalled';
        if (!isCurrentConversation) {
            console.log('⏭️ 消息不属于当前会话，跳过');
            return;
        }
        switch (message.action) {
            case 'receive_message':
            case 'new_message':
                handleNewMessage(data);
                break;
            case 'message_sent':
                handleMessageSent(data);
                break;
            case 'message_delivered':
                handleMessageDelivered(data);
                break;
            case 'message_read':
                handleMessageRead(data);
                break;
            case 'message_recalled':
                handleMessageRecalled(data);
                break;
            case 'user_typing':
                handleUserTyping(data);
                break;
            default:
                console.log('未知消息类型:', message.action);
        }
    }, [localConversationId, currentUser, paramTargetId, handleNewMessage, handleMessageSent,
        handleMessageDelivered, handleMessageRead, handleMessageRecalled, handleUserTyping]);

    // 初始化
    useEffect(() => {
        initializeConversation();
    }, [initializeConversation]);

    // 获取目标信息
    useEffect(() => {
        if (!conversation) return;
        const timeoutId = setTimeout(() => {
            fetchTargetInfo();
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [conversation, fetchTargetInfo]);

    // WebSocket 监听
    // 新增 ref 稳定处理器
    const messageHandlerRef = useRef(handleWebSocketMessage);
    useEffect(() => {
        messageHandlerRef.current = handleWebSocketMessage;
    }, [handleWebSocketMessage]);

    useEffect(() => {
        if (!localConversationId) return;
        console.log('🎧 开始监听WebSocket消息，会话ID:', localConversationId);
        const handler = (msg) => messageHandlerRef.current(msg);
        onMessage(handler);
        return () => {
            console.log('🧹 清理WebSocket监听器');
            offMessage(handler);
        };
    }, [localConversationId, onMessage, offMessage]); // 注意：依赖数组中去掉了 handleWebSocketMessage

    // 消息状态更新
    useEffect(() => {
        if (messageStatusUpdates.size === 0) return;
        console.log('📊 处理消息状态更新:', messageStatusUpdates);
        let hasChanges = false;
        const updatedMessages = messages.map(msg => {
            const tempUpdate = msg.client_msg_id ? messageStatusUpdates.get(String(msg.client_msg_id)) : null;
            const update = messageStatusUpdates.get(String(msg.id)) || tempUpdate;
            if (!update) return msg;
            const newMsg = { ...msg };
            if (String(msg.id).startsWith('temp_') && update.message_id) {
                newMsg.id = String(update.message_id);
                hasChanges = true;
                console.log('🆔 更新消息ID:', { old: msg.id, new: newMsg.id });
            }
            if (update.status !== undefined && newMsg.status !== update.status) {
                newMsg.status = update.status;
                hasChanges = true;
                console.log('🔄 更新消息状态:', { id: newMsg.id, oldStatus: msg.status, newStatus: update.status });
            }
            return newMsg;
        });
        if (hasChanges) {
            console.log('✅ 应用消息状态更新');
            setMessages(updatedMessages);
        }
    }, [messageStatusUpdates, messages]);

    // 滚动到底部
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(scrollToBottom, 100);
        }
    }, [messages]);

    // 发送消息
    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !currentUser || !conversation) {
            console.error('发送消息条件不满足');
            return;
        }
        let receiverId;
        let convType;
        if (conversation.type === 0) {
            const otherMember = conversation.member_ids?.find(
                memberId => String(memberId) !== String(currentUser.id)
            );
            if (!otherMember) {
                console.error('无法确定接收者');
                return;
            }
            receiverId = String(otherMember);
            convType = 0;
        } else {
            receiverId = String(conversation.group_id || conversation.target_id);
            convType = 1;
        }
        const clientMsgId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const messagePayload = {
            conversation_id: String(localConversationId),
            receiver_id: receiverId,
            conv_type: convType,
            msg_type: 0,
            content: { text: inputMessage.trim() },
            client_msg_id: clientMsgId
        };
        console.log('📤 发送消息 payload:', messagePayload);
        if (!isConnected()) {
            console.error('WebSocket未连接，无法发送消息');
            alert('连接已断开，请稍后重试');
            return;
        }
        const tempMessage = {
            id: clientMsgId,
            sender_id: String(currentUser.id),
            receiver_id: receiverId,
            conversation_id: String(localConversationId),
            conv_type: convType,
            msg_type: 0,
            content: { text: inputMessage.trim() },
            status: 0,
            is_recalled: false,
            created_at: new Date().toISOString(),
            client_msg_id: clientMsgId
        };
        console.log('➕ 添加临时消息:', tempMessage);
        setMessages(prev => [...prev, tempMessage]);
        setInputMessage('');
        const success = wsSendMessage(messagePayload);
        if (!success) {
            console.error('❌ WebSocket发送失败');
            setMessages(prev => prev.map(msg =>
                msg.id === clientMsgId ? { ...msg, status: 99 } : msg
            ));
            alert('消息发送失败，请检查网络连接');
        }
        scrollToBottom();
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputMessage(value);
        if (conversation && targetInfo) {
            wsSendTypingStatus(
                targetInfo.id,
                conversation.type || 0,
                value.length > 0,
                value
            );
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

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

    const handleLoadMore = useCallback(() => {
        if (hasMore && !loadingMore && messages.length > 0) {
            const lastMsgId = messages[0]?.id || "0";
            console.log('加载更多消息，lastMsgId:', lastMsgId);
            fetchMessages(page + 1, lastMsgId);
        }
    }, [hasMore, loadingMore, messages, page, fetchMessages]);

    const handleScroll = () => {
        if (messageContainerRef.current) {
            const { scrollTop } = messageContainerRef.current;
            if (scrollTop < 100 && hasMore && !loadingMore) {
                handleLoadMore();
            }
        }
    };

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

    const handleRetry = () => {
        setError(null);
        fetchConversationDetail(true);
    };

    const renderDebugInfo = () => {
        if (!showDebugInfo) return null;
        return (
            <div className="debug-info">
                <p>会话ID: {localConversationId}</p>
                <p>连接状态: {connectionStatus}</p>
                <p>消息数量: {messages.length}</p>
                <p>目标用户: {targetInfo?.id}</p>
                <p>当前用户: {currentUser?.id}</p>
            </div>
        );
    };

    if (!localConversationId && isLoading) {
        return (
            <div className="chat-room-loading">
                <div className="loading-spinner"></div>
                <p>获取会话信息中...</p>
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

    return (
        <div className="chat-room">
            {renderDebugInfo()}

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
                                        targetOnline ? '在线' : '离线'}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="chat-header-details">
                            <h3>
                                {conversation?.type === 0 ?
                                    `用户${paramTargetId || '加载中'}` :
                                    `群组${paramTargetId || '加载中'}`}
                            </h3>
                            <p className="chat-status">加载中...</p>
                        </div>
                    )}
                </div>
                <div className="chat-header-actions">
                    <button
                        className="chat-action-btn"
                        onClick={() => setShowDebugInfo(!showDebugInfo)}
                        title="调试信息"
                    >
                        🔧
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
                            <p className="connection-hint">
                                {connectionStatus === 'connected' ?
                                    '连接正常 ✓' :
                                    `连接状态: ${connectionStatus}，消息可能无法实时接收`}
                            </p>
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
                                                    <>
                                                        <p className="message-text">{message.content.text}</p>
                                                        {message.content.text.startsWith('[邀请]') && (
                                                            <button
                                                                className="join-group-btn"
                                                                onClick={async () => {
                                                                    const match = message.content.text.match(/加入群组 (\d+)/);
                                                                    if (match && match[1]) {
                                                                        const groupId = match[1];
                                                                        try {
                                                                            const modeRes = await groupApi.checkGroupAddMode(groupId);
                                                                            if (modeRes?.add_mode === 0) {
                                                                                await groupApi.enterGroupDirectly(groupId);
                                                                                alert('已加入群聊');
                                                                                navigate(`/group/${groupId}`);
                                                                            } else {
                                                                                const reason = prompt('请输入申请理由：');
                                                                                if (reason !== null) {
                                                                                    await groupApi.applyJoinGroup(groupId, reason);
                                                                                    alert('申请已提交，等待审核');
                                                                                }
                                                                            }
                                                                        } catch (error) {
                                                                            console.error('加入群聊失败', error);
                                                                            alert('加入失败，请稍后重试');
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                加入群聊
                                                            </button>
                                                        )}
                                                    </>
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
                    placeholder={connectionStatus === 'connected' ? "输入消息..." : "连接已断开，正在重连..."}
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    rows={3}
                    disabled={connectionStatus !== 'connected'}
                />
                <button
                    className="chat-send-btn"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || connectionStatus !== 'connected'}
                >
                    {connectionStatus === 'connected' ? '发送' : '连接中...'}
                </button>
            </div>
        </div>
    );
};

export default ChatRoom;