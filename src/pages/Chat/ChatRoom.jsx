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
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [showDebugInfo, setShowDebugInfo] = useState(false);

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
    const pendingMessagesRef = useRef(new Map()); // 存储待处理的消息
    const reconnectAttemptRef = useRef(0);

    // WebSocket相关功能
    const {
        sendMessage: wsSendMessage,
        sendTypingStatus: wsSendTypingStatus,
        sendReadReceipt: wsSendReadReceipt,
        recallMessage: wsRecallMessage,
        isTyping: wsIsTyping,
        messageStatusUpdates,
        onMessage,
        offMessage,
        isConnected,
        reconnect
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

    // 监听WebSocket连接状态
    useEffect(() => {
        const checkConnection = () => {
            const status = isConnected() ? 'connected' : 'disconnected';
            setConnectionStatus(status);

            // 如果断开连接，尝试重连
            if (status === 'disconnected' && reconnectAttemptRef.current < 3) {
                reconnectAttemptRef.current += 1;
                setTimeout(() => {
                    console.log('尝试重新连接WebSocket...');
                    reconnect();
                }, 2000 * reconnectAttemptRef.current);
            } else if (status === 'connected') {
                reconnectAttemptRef.current = 0;
            }
        };

        // 初始检查
        checkConnection();

        // 定期检查连接状态
        const interval = setInterval(checkConnection, 5000);

        return () => clearInterval(interval);
    }, [isConnected, reconnect]);

    // 获取会话详情
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

                const cacheKey = `user_${otherMemberId}`;
                const cachedUser = getCachedUser(otherMemberId);
                if (cachedUser) {
                    console.log('使用缓存的用户信息');
                    setTargetInfo(cachedUser);
                    return;
                }

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

                const cacheKey = `group_${groupId}`;
                const cachedGroup = getCachedGroup(groupId);
                if (cachedGroup) {
                    console.log('使用缓存的群组信息');
                    setTargetInfo(cachedGroup);
                    return;
                }

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
        if (!conversationId) {
            console.error('没有会话ID，无法获取消息');
            return;
        }

        try {
            console.log('正在获取消息，参数:', {
                conversationId,
                pageNum,
                referenceId
            });

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
    }, [conversationId]);

    // 初始化会话
    const initializeConversation = useCallback(() => {
        if (!conversationId || initializedRef.current) return;

        initializedRef.current = true;

        // 优先使用传入的会话数据
        if (initialConversation && initialConversation.id === conversationId) {
            console.log('使用传入的会话信息:', initialConversation);
            setConversation(initialConversation);
            cacheConversation(initialConversation);

            // 获取消息
            fetchMessages(1, "0");
            return;
        }

        // 否则获取会话详情
        fetchConversationDetail();
    }, [conversationId, initialConversation, fetchConversationDetail, cacheConversation, fetchMessages]);

    // 处理WebSocket新消息 - 优化版
    const handleWebSocketMessage = useCallback((message) => {
        console.log('🎯 收到WebSocket新消息:', {
            message,
            currentConversationId: conversationId,
            messageConversationId: message.conversation_id,
            type: message.type || 'unknown'
        });

        // 更宽松的消息检查逻辑
        const messageConvId = message.conversation_id || message.conversationId;
        const currentConvId = conversationId;

        // 检查消息是否属于当前会话
        const isCurrentConversation =
            // 情况1：消息有会话ID且匹配当前会话
            (messageConvId && currentConvId && String(messageConvId) === String(currentConvId)) ||
            // 情况2：消息没有会话ID，但接收者是当前用户
            (!messageConvId && String(message.receiver_id) === String(currentUser?.id)) ||
            // 情况3：消息没有会话ID，但发送者是目标用户（单聊）
            (!messageConvId && String(message.sender_id) === String(paramTargetId)) ||
            // 情况4：消息是系统消息
            message.type === 'system' ||
            // 情况5：消息是撤回通知
            message.action === 'message_recalled';

        if (!isCurrentConversation) {
            console.log('⏭️ 消息不属于当前会话，跳过', {
                messageConvId,
                currentConvId,
                sender: message.sender_id,
                receiver: message.receiver_id
            });

            // 如果是撤回通知，但属于当前会话的消息
            if (message.action === 'message_recalled' && message.data?.conversation_id === currentConvId) {
                // 仍然处理撤回消息
                console.log('处理当前会话的撤回消息');
            } else {
                return;
            }
        }

        // 处理不同的消息类型
        switch (message.action) {
            case 'receive_message':
            case 'new_message':
                handleNewMessage(message);
                break;
            case 'message_sent':
                handleMessageSent(message);
                break;
            case 'message_delivered':
                handleMessageDelivered(message);
                break;
            case 'message_read':
                handleMessageRead(message);
                break;
            case 'message_recalled':
                handleMessageRecalled(message);
                break;
            case 'user_typing':
                handleUserTyping(message);
                break;
            default:
                console.log('未知消息类型:', message.action);
        }
    }, [conversationId, currentUser, paramTargetId]);

    // 处理新消息
    const handleNewMessage = useCallback((message) => {
        // 格式化消息
        const formattedMessage = {
            ...message.data || message,
            id: String(message.data?.id || message.id || message.message_id),
            sender_id: String(message.data?.sender_id || message.sender_id),
            receiver_id: String(message.data?.receiver_id || message.receiver_id),
            conversation_id: String(message.data?.conversation_id || message.conversation_id),
            status: message.data?.status || message.status || 2, // 默认已送达
            created_at: message.data?.created_at || message.created_at || new Date().toISOString()
        };

        console.log('📝 格式化后的新消息:', formattedMessage);

        // 添加到消息列表
        setMessages(prev => {
            const existingIds = new Set(prev.map(m => String(m.id)));
            if (existingIds.has(String(formattedMessage.id))) {
                // 已存在，更新状态
                console.log('🔄 消息已存在，更新状态');
                return prev.map(m =>
                    String(m.id) === String(formattedMessage.id)
                        ? { ...m, ...formattedMessage }
                        : m
                );
            } else {
                // 新消息，添加到列表末尾
                console.log('➕ 添加新消息到列表');
                return [...prev, formattedMessage];
            }
        });

        // 滚动到底部
        setTimeout(scrollToBottom, 50);

        // 发送已读回执
        if (String(formattedMessage.sender_id) !== String(currentUser?.id)) {
            wsSendReadReceipt(conversationId, formattedMessage.id);
        }
    }, [conversationId, currentUser, wsSendReadReceipt]);

    // 处理消息发送成功
    const handleMessageSent = useCallback((message) => {
        console.log('✅ 消息发送成功:', message);

        const data = message.data || message;
        const tempId = data.client_msg_id;
        const serverId = data.message_id;

        if (tempId && serverId) {
            // 更新临时消息的ID
            setMessages(prev => prev.map(msg => {
                if (msg.id === tempId || msg.client_msg_id === tempId) {
                    return {
                        ...msg,
                        id: String(serverId),
                        status: 1, // 已发送
                        message_id: String(serverId)
                    };
                }
                return msg;
            }));
        }
    }, []);

    // 处理消息已送达
    const handleMessageDelivered = useCallback((message) => {
        console.log('📨 消息已送达:', message);

        const data = message.data || message;
        const messageId = data.message_id;

        if (messageId) {
            setMessages(prev => prev.map(msg => {
                if (String(msg.id) === String(messageId)) {
                    return { ...msg, status: 2 }; // 已送达
                }
                return msg;
            }));
        }
    }, []);

    // 处理消息已读
    const handleMessageRead = useCallback((message) => {
        console.log('👁️ 消息已读:', message);

        const data = message.data || message;
        const messageId = data.message_id;

        if (messageId) {
            setMessages(prev => prev.map(msg => {
                if (String(msg.id) === String(messageId)) {
                    return { ...msg, status: 3 }; // 已读
                }
                return msg;
            }));
        }
    }, []);

    // 处理消息撤回
    const handleMessageRecalled = useCallback((message) => {
        console.log('↩️ 消息撤回:', message);

        const data = message.data || message;
        const messageId = data.message_id;

        if (messageId) {
            setMessages(prev => prev.map(msg => {
                if (String(msg.id) === String(messageId)) {
                    return { ...msg, is_recalled: true, status: 4 }; // 已撤回
                }
                return msg;
            }));
        }
    }, []);

    // 处理用户正在输入
    const handleUserTyping = useCallback((message) => {
        console.log('⌨️ 用户正在输入:', message);
        // 这里可以设置显示"对方正在输入"的UI
    }, []);

    // 初始化
    useEffect(() => {
        initializeConversation();
    }, [initializeConversation]);

    // 监听conversation变化，获取目标信息
    useEffect(() => {
        if (!conversation) return;

        const timeoutId = setTimeout(() => {
            fetchTargetInfo();
        }, 200);

        return () => clearTimeout(timeoutId);
    }, [conversation, fetchTargetInfo]);

    // 监听WebSocket消息和状态更新
    useEffect(() => {
        if (!conversationId) return;

        console.log('🎧 开始监听WebSocket消息，会话ID:', conversationId);

        // 注册监听器
        onMessage(handleWebSocketMessage);

        // 清理函数
        return () => {
            console.log('🧹 清理WebSocket监听器');
            offMessage(handleWebSocketMessage);
        };
    }, [conversationId, onMessage, offMessage, handleWebSocketMessage]);

    // WebSocket状态更新处理
    useEffect(() => {
        if (messageStatusUpdates.size === 0) return;

        console.log('📊 处理消息状态更新:', messageStatusUpdates);

        let hasChanges = false;
        const updatedMessages = messages.map(msg => {
            // 检查临时消息ID
            const tempUpdate = msg.client_msg_id ? messageStatusUpdates.get(String(msg.client_msg_id)) : null;
            // 检查正式消息ID
            const update = messageStatusUpdates.get(String(msg.id)) || tempUpdate;

            if (!update) return msg;

            const newMsg = { ...msg };

            // 处理ID升级（临时消息ID转正式ID）
            if (String(msg.id).startsWith('temp_') && update.message_id) {
                newMsg.id = String(update.message_id);
                hasChanges = true;
                console.log('🆔 更新消息ID:', { old: msg.id, new: newMsg.id });
            }

            // 处理状态更新
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

    // 消息变化时滚动到底部
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

        // 确定接收者
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

        // 生成客户端消息ID
        const clientMsgId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const messagePayload = {
            conversation_id: String(conversation.id),
            receiver_id: receiverId,
            conv_type: convType,
            msg_type: 0,
            content: { text: inputMessage.trim() },
            client_msg_id: clientMsgId
        };

        console.log('📤 发送消息 payload:', messagePayload);

        // 检查WebSocket连接
        if (!isConnected()) {
            console.error('WebSocket未连接，无法发送消息');
            alert('连接已断开，请刷新页面重试');
            return;
        }

        // 临时消息
        const tempMessage = {
            id: clientMsgId,
            sender_id: String(currentUser.id),
            receiver_id: receiverId,
            conversation_id: String(conversationId),
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

        // 通过WebSocket发送
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

    // 处理输入变化
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputMessage(value);

        // 可选：发送正在输入状态
        if (conversation && targetInfo) {
            wsSendTypingStatus(
                targetInfo.id,
                conversation.type || 0,
                value.length > 0,
                value
            );
        }
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

    // 调试信息
    const renderDebugInfo = () => {
        if (!showDebugInfo) return null;

        return (
            <div className="debug-info">
                <p>会话ID: {conversationId}</p>
                <p>连接状态: {connectionStatus}</p>
                <p>消息数量: {messages.length}</p>
                <p>目标用户: {targetInfo?.id}</p>
                <p>当前用户: {currentUser?.id}</p>
            </div>
        );
    };

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

    console.log('📊 当前状态:', {
        isLoading,
        messagesCount: messages.length,
        hasMore,
        loadingMore,
        conversation: conversation ? '已加载' : '未加载',
        targetInfo: targetInfo ? '已加载' : '未加载',
        connectionStatus
    });

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
                                        connectionStatus === 'connected' ? '在线' : '离线'}
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
                                                                    // 解析群ID
                                                                    const match = message.content.text.match(/加入群组 (\d+)/);
                                                                    if (match && match[1]) {
                                                                        const groupId = match[1];
                                                                        try {
                                                                            // 检查加群方式
                                                                            const modeRes = await groupApi.checkGroupAddMode(groupId);
                                                                            if (modeRes?.add_mode === 0) {
                                                                                await groupApi.enterGroupDirectly(groupId);
                                                                                alert('已加入群聊');
                                                                                // 刷新群列表或跳转
                                                                                navigate(`/group/${groupId}`);
                                                                            } else {
                                                                                // 需要申请
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
                    placeholder={connectionStatus === 'connected' ? "输入消息..." : "连接断开，请刷新页面"}
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