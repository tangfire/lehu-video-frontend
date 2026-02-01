import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { messageApi } from '../../api/message';
import { friendApi } from '../../api/friend';
import { groupApi } from '../../api/group';
import { useWebSocket } from '../../components/WebSocket/WebSocketProvider';
import { getCurrentUser } from '../../api/user';
import './Chat.css';

const ChatRoom = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [targetInfo, setTargetInfo] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    const messagesEndRef = useRef(null);
    const messageContainerRef = useRef(null);
    const currentUser = getCurrentUser();
    const { type, targetId } = useParams();
    const location = useLocation();
    const { conversationId } = location.state || {};
    const navigate = useNavigate();

    const {
        sendTypingStatus,
        sendReadReceipt,
        recallMessage: wsRecallMessage,
        sendMessage: wsSendMessage,
        messageStatusUpdates,
        isTyping,
        getMessageStatusUpdate,
        clearMessageStatusUpdate
    } = useWebSocket();

    console.log('ChatRoom 参数:', { type, targetId, conversationId, locationState: location.state });

    if (!conversationId) {
        return (
            <div className="chat-room-error">
                <div className="error-icon">⚠️</div>
                <h3>无法加载会话</h3>
                <p>会话信息缺失，请返回重新进入</p>
                <button onClick={() => navigate(-1)}>返回</button>
            </div>
        );
    }

    useEffect(() => {
        if (messageStatusUpdates.size === 0) return;

        setMessages(prev => {
            let hasAnyChange = false;

            // 1. 先进行映射处理
            const next = prev.map(msg => {
                const update = messageStatusUpdates.get(String(msg.id));
                if (!update) return msg;

                let newMsg = { ...msg };
                let currentMsgChanged = false;

                // 处理 ID 升级
                if (String(msg.id).startsWith('temp_') && update.message_id) {
                    console.log('升级消息 ID:', msg.id, '→', update.message_id);
                    newMsg.id = String(update.message_id);
                    currentMsgChanged = true;
                }

                // 处理状态更新
                if (update.status !== undefined && newMsg.status !== update.status) {
                    newMsg.status = update.status;
                    currentMsgChanged = true;
                }

                if (currentMsgChanged) hasAnyChange = true;
                return newMsg;
            });

            // 2. 如果发生了变化（特别是 ID 升级），必须强制去重
            if (hasAnyChange) {
                const uniqueMap = new Map();
                next.forEach(m => {
                    const idStr = String(m.id);
                    // 如果 ID 冲突了，保留最新的那个（通常是刚升级的这条）
                    uniqueMap.set(idStr, m);
                });
                return Array.from(uniqueMap.values());
            }

            return prev;
        });
    }, [messageStatusUpdates]);




    // 获取会话信息
    useEffect(() => {
        const fetchConversationInfo = async () => {
            try {
                if (type === 'single') {
                    // 单聊：获取好友信息
                    const userResponse = await friendApi.searchUsers('', { page: 1, page_size: 50 });
                    const user = userResponse.users.find(u => String(u.id) === String(targetId));
                    if (user) {
                        setTargetInfo({
                            ...user,
                            id: String(user.id)
                        });
                    }
                } else if (type === 'group') {
                    // 群聊：获取群组信息
                    const response = await groupApi.getGroupInfo(targetId);
                    setTargetInfo({
                        ...response.group,
                        id: String(response.group.id)
                    });
                }
            } catch (error) {
                console.error('获取会话信息失败:', error);
            }
        };

        if (targetId) {
            fetchConversationInfo();
        }
    }, [targetId, type]);

    // 获取消息历史
    const fetchMessages = useCallback(async (pageNum = 1) => {
        if (!conversationId) return;

        try {
            if (pageNum === 1) {
                setIsLoading(true);
            } else {
                setLoadingMore(true);
            }

            // 注意：向上拉取历史消息，通常是基于当前列表的第一条消息 ID 往回找
            const referenceId = pageNum === 1 ? "0" : messages[0]?.id || "0";

            const response = await messageApi.listMessages(
                conversationId,
                referenceId,
                20
            );

            const formattedMessages = (response.messages || []).map(msg => ({
                ...msg,
                id: String(msg.id),
                sender_id: String(msg.sender_id),
                receiver_id: String(msg.receiver_id),
                conversation_id: String(msg.conversation_id),
                status: msg.status || 0
            }));

            if (pageNum === 1) {
                setMessages(formattedMessages);
            } else {
                setMessages(prev => {
                    // --- 关键去重逻辑 ---
                    // 创建一个当前已有 ID 的集合
                    const existingIds = new Set(prev.map(m => String(m.id)));
                    // 过滤掉已经在列表中存在的历史消息
                    const newUniqueMessages = formattedMessages.filter(
                        m => !existingIds.has(String(m.id))
                    );
                    // 将真正“新”的历史消息拼在前面
                    return [...newUniqueMessages, ...prev];
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
    }, [conversationId, messages]);

    useEffect(() => {
        fetchMessages(1);
    }, [conversationId]);

    // 滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 发送消息
    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !currentUser) return;

        // 生成唯一的客户端 ID
        const clientMsgId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const messagePayload = {
            receiver_id: String(targetId),
            conv_type: type === 'single' ? 0 : 1,
            msg_type: 0,
            content: { text: inputMessage.trim() },
            client_msg_id: clientMsgId
        };

        console.log('发送消息 payload:', messagePayload);

        // 先把临时消息塞进 UI
        const tempMessage = {
            id: clientMsgId,
            sender_id: String(currentUser.id),
            receiver_id: String(targetId),
            conversation_id: String(conversationId),
            conv_type: type === 'single' ? 0 : 1,
            msg_type: 0,
            content: { text: inputMessage.trim() },
            status: 0, // SENDING
            is_recalled: false,
            created_at: new Date().toISOString()
        };

        console.log('添加临时消息:', tempMessage);
        setMessages(prev => [...prev, tempMessage]);
        setInputMessage('');

        // 发送给 WS
        const success = wsSendMessage(messagePayload);
        if (!success) {
            console.error('WebSocket发送失败');
            // 发送失败，更新状态
            setMessages(prev => prev.map(msg =>
                msg.id === clientMsgId ? { ...msg, status: 99 } : msg
            ));
        }

        scrollToBottom();
    };

    // 处理输入变化（发送输入状态）
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputMessage(value);

        // 发送输入状态
        if (value.trim()) {
            sendTypingStatus(targetId, type === 'single' ? 0 : 1, true, value);
        } else {
            sendTypingStatus(targetId, type === 'single' ? 0 : 1, false);
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

    // 标记消息已读
    const markMessagesAsRead = useCallback(async () => {
        if (messages.length > 0 && conversationId) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && String(lastMessage.sender_id) !== String(currentUser.id)) {
                try {
                    await messageApi.markMessagesRead(conversationId, lastMessage.id);
                    // 通过WebSocket发送已读回执
                    sendReadReceipt(conversationId, lastMessage.id);
                } catch (error) {
                    console.error('标记消息已读失败:', error);
                }
            }
        }
    }, [messages, conversationId, currentUser, sendReadReceipt]);

    useEffect(() => {
        markMessagesAsRead();
    }, [markMessagesAsRead]);

    // 加载更多消息
    const handleLoadMore = () => {
        if (hasMore && !loadingMore) {
            fetchMessages(page + 1);
        }
    };

    // 处理滚动
    const handleScroll = () => {
        if (messageContainerRef.current) {
            const { scrollTop } = messageContainerRef.current;
            if (scrollTop === 0 && hasMore && !loadingMore) {
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
                // 如果时间戳是秒，转换为毫秒
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

    if (isLoading && messages.length === 0) {
        return (
            <div className="chat-room-loading">
                <div className="loading-spinner"></div>
                <p>加载消息中...</p>
            </div>
        );
    }

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
                                src={targetInfo.avatar || '/default-avatar.png'}
                                alt={targetInfo.name}
                                className="chat-header-avatar"
                                onError={(e) => {
                                    e.target.src = type === 'single' ? '/default-avatar.png' : '/default-group-avatar.png';
                                }}
                            />
                            <div className="chat-header-details">
                                <h3>{targetInfo.name || (type === 'single' ? `用户${targetId}` : `群组${targetId}`)}</h3>
                                <p className="chat-status">
                                    {type === 'group' ? `${targetInfo.member_cnt || targetInfo.member_count || 0} 名成员` : '在线'}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="chat-header-details">
                            <h3>{type === 'single' ? `用户${targetId}` : `群组${targetId}`}</h3>
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
                {hasMore && (
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
                    {messages.map((message) => {
                        // 获取消息状态更新
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
                                        {String(message.sender_id) === String(currentUser.id) && !message.is_recalled && displayStatus !== 4 && (
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
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {isTyping(String(targetId), String(conversationId)) && (
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