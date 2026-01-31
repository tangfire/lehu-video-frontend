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
        recallMessage: wsRecallMessage
    } = useWebSocket();

    // 添加调试信息
    console.log('ChatRoom 参数:', { type, targetId, conversationId, locationState: location.state });

    // 如果没有 conversationId，显示错误
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

    const {
        sendMessage: wsSendMessage,
        messageStatusUpdates, // 直接从 context 拿到这个 Map
        isTyping
    } = useWebSocket();
    // 监听消息状态更新
    // 核心修改：监听状态更新 Map
    useEffect(() => {
        if (messageStatusUpdates.size === 0) return;

        setMessages(prev => {
            let hasChanged = false;
            const newMessages = prev.map(msg => {
                // 1. 尝试用当前消息 ID 去 Map 里找有没有更新
                // 强制转 String 避免 Snowflake ID 精度问题
                const update = messageStatusUpdates.get(String(msg.id));

                if (update && msg.status !== update.status) {
                    hasChanged = true;
                    console.log(`更新消息 [${msg.id}] 状态为: ${update.status}`);
                    return {
                        ...msg,
                        // 如果有后端返回的正式 ID，把 temp_id 替换掉
                        id: update.messageId || msg.id,
                        status: update.status
                    };
                }
                return msg;
            });

            return hasChanged ? newMessages : prev;
        });
    }, [messageStatusUpdates]); // 依赖项是 Map，只要 Provider 里更新了，这里就会跑

    // 获取会话信息
    useEffect(() => {
        const fetchConversationInfo = async () => {
            try {
                if (type === 'single') {
                    // 单聊：获取好友信息
                    const response = await friendApi.checkFriendRelation(targetId);
                    // 获取用户详细信息
                    const userResponse = await friendApi.searchUsers('', { page: 1, page_size: 1 });
                    const user = userResponse.users.find(u => u.id === parseInt(targetId));
                    setTargetInfo(user);
                } else if (type === 'group') {
                    // 群聊：获取群组信息
                    const response = await groupApi.getGroupInfo(targetId);
                    setTargetInfo(response.group);
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

            const response = await messageApi.listMessages(
                conversationId,
                pageNum === 1 ? 0 : messages[messages.length - 1]?.id || 0,
                20
            );

            if (pageNum === 1) {
                setMessages(response.messages || []);
            } else {
                setMessages(prev => [...(response.messages || []), ...prev]);
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
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const messagePayload = {
            receiver_id: parseInt(targetId),
            conv_type: type === 'single' ? 0 : 1,
            msg_type: 0,
            content: { text: inputMessage.trim() },
            client_msg_id: tempId // 确保这个 ID 传进去了
        };

        // 先把临时消息塞进 UI
        const tempMessage = {
            id: tempId, // 初始使用 tempId
            sender_id: currentUser.id,
            content: { text: inputMessage.trim() },
            status: 0, // SENDING
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, tempMessage]);
        setInputMessage('');

        // 发送给 WS
        wsSendMessage(messagePayload);
        scrollToBottom();
    };

    // 处理输入变化（发送输入状态）
    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputMessage(value);

        // 发送输入状态
        if (value.trim()) {
            sendTypingStatus(parseInt(targetId), type === 'single' ? 0 : 1, true, value);
        } else {
            sendTypingStatus(parseInt(targetId), type === 'single' ? 0 : 1, false);
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
                        msg.id === messageId
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
            if (lastMessage && lastMessage.sender_id !== currentUser.id) {
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
            if (typeof timestamp === 'string') {
                const date = new Date(timestamp);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (typeof timestamp === 'number') {
                const date = new Date(timestamp);
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return '';
        } catch (error) {
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
                    {targetInfo && (
                        <>
                            <img
                                src={targetInfo.avatar || '/default-avatar.png'}
                                alt={targetInfo.name}
                                className="chat-header-avatar"
                            />
                            <div className="chat-header-details">
                                <h3>{targetInfo.name || '未知用户'}</h3>
                                <p className="chat-status">
                                    {type === 'group' ? `${targetInfo.member_cnt || 0} 名成员` : '在线'}
                                </p>
                            </div>
                        </>
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
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`message-item ${
                                message.sender_id === currentUser.id ? 'sent' : 'received'
                            } ${message.is_recalled ? 'recalled' : ''}`}
                        >
                            {message.is_recalled ? (
                                <div className="message-content">
                                    <p className="message-text">消息已被撤回</p>
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
                                        {message.sender_id === currentUser.id && (
                                            <span className={`message-status status-${message.status}`}>
                                                {getStatusText(message.status)}
                                            </span>
                                        )}
                                    </div>
                                    {message.sender_id === currentUser.id && !message.is_recalled && message.status !== 4 && (
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
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {isTyping(parseInt(targetId), conversationId) && (
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