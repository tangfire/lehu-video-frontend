// WebSocketProvider.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { webSocketAPI } from '../../api/websocket';
import { getCurrentUser } from '../../api/user';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider = ({ children }) => {
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [typingUsers, setTypingUsers] = useState(new Map());
    const [messageStatusUpdates, setMessageStatusUpdates] = useState(new Map());

    // 处理新消息
    const handleNewMessage = useCallback((message) => {
        console.log('收到新消息:', message);

        // 触发新消息事件，让ChatRoom组件处理
        // 注意：这里我们不再直接更新状态，而是通过事件让组件自己处理

        const user = getCurrentUser();
        if (user && String(message.sender_id) !== String(user.id)) {
            setUnreadCount(prev => prev + 1);

            const newNotification = {
                id: Date.now(),
                type: 'message',
                title: '新消息',
                content: `收到来自用户 ${message.sender_id} 的消息`,
                timestamp: Date.now(),
                read: false
            };

            setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
        }
    }, []);

    // 处理消息发送成功
    const handleMessageSent = useCallback((data) => {
        console.log('收到发送确认:', data);

        const info = data.data || data;
        const serverId = info.message_id ? String(info.message_id) : null;
        const clientId = info.client_msg_id || data.client_msg_id;

        console.log('发送确认信息:', { serverId, clientId, info });

        if (!serverId && !clientId) return;

        setMessageStatusUpdates(prev => {
            const newMap = new Map(prev);

            const updateObj = {
                message_id: serverId,
                client_msg_id: clientId,
                status: 1, // SENT
                timestamp: Date.now()
            };

            // 用 client_msg_id 做升级 key
            if (clientId) {
                newMap.set(String(clientId), updateObj);
            }

            // 同时也用 serverId，方便后续 delivered/read
            if (serverId) {
                newMap.set(String(serverId), updateObj);
            }

            console.log('更新 messageStatusUpdates:', newMap);
            return newMap;
        });
    }, []);

    // 处理消息已送达
    const handleMessageDelivered = useCallback((data) => {
        console.log('消息已送达:', data);

        const info = data.data || data;
        const messageId = info.message_id ? String(info.message_id) : null;

        if (messageId) {
            setMessageStatusUpdates(prev => {
                const newMap = new Map(prev);
                newMap.set(messageId, {
                    messageId: messageId,
                    status: 2, // DELIVERED
                    receiverId: info.receiver_id ? String(info.receiver_id) : null,
                    timestamp: Date.now()
                });

                console.log('消息已送达更新:', newMap);
                return newMap;
            });
        }
    }, []);

    // 处理消息已读
    const handleMessageRead = useCallback((data) => {
        console.log('消息已读:', data);

        const info = data.data || data;
        const messageId = info.message_id ? String(info.message_id) : null;

        if (messageId) {
            setMessageStatusUpdates(prev => {
                const newMap = new Map(prev);
                newMap.set(messageId, {
                    messageId: messageId,
                    status: 3, // READ
                    readerId: info.reader_id ? String(info.reader_id) : null,
                    timestamp: Date.now()
                });

                return newMap;
            });
        }
    }, []);

    const handleNotFriend = useCallback((data) => {
        const { client_msg_id, error } = data;

        setMessageStatusUpdates(prev => {
            const newMap = new Map(prev);
            newMap.set(String(client_msg_id), {
                status: 99, // 发送失败
                error
            });
            return newMap;
        });
    }, []);

    // 处理消息撤回
    const handleMessageRecalled = useCallback((data) => {
        console.log('消息已撤回:', data);

        const info = data.data || data;
        const messageId = info.message_id ? String(info.message_id) : null;

        if (messageId) {
            setMessageStatusUpdates(prev => {
                const newMap = new Map(prev);
                newMap.set(messageId, {
                    messageId: messageId,
                    status: 4, // RECALLED
                    recalledBy: info.recalled_by ? String(info.recalled_by) : null,
                    timestamp: Date.now()
                });

                return newMap;
            });
        }
    }, []);

    const handleTyping = useCallback((data) => {
        const info = data.data || data;
        const { sender_id, receiver_id, is_typing, text } = info;

        setTypingUsers(prev => {
            const newMap = new Map(prev);
            const key = `${String(sender_id)}_${String(receiver_id)}`;

            if (is_typing) {
                newMap.set(key, {
                    userId: String(sender_id),
                    isTyping: true,
                    text,
                    timestamp: Date.now()
                });
            } else {
                newMap.delete(key);
            }

            return newMap;
        });
    }, []);

    const handleNotification = useCallback((notification) => {
        console.log('收到通知:', notification);
        setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    }, []);

    const handleConnectionStatus = useCallback((status) => {
        console.log('WebSocket连接状态更新:', status);
        setConnectionStatus(status);
    }, []);

    const connectWebSocket = useCallback(() => {
        const user = getCurrentUser();
        const token = localStorage.getItem('token');

        if (!token || !user) {
            console.log('用户未登录，跳过WebSocket连接');
            return;
        }

        try {
            webSocketAPI.connect(token);
        } catch (error) {
            console.error('WebSocket连接失败:', error);
        }
    }, []);

    // 监听连接状态变化并自动重连
    useEffect(() => {
        if (connectionStatus === 'disconnected') {
            const timer = setTimeout(() => {
                console.log('尝试重新连接WebSocket...');
                connectWebSocket();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [connectionStatus, connectWebSocket]);

    // 获取消息状态更新
    const getMessageStatusUpdate = useCallback((id) => {
        return messageStatusUpdates.get(String(id));
    }, [messageStatusUpdates]);

    // 清除消息状态更新
    const clearMessageStatusUpdate = useCallback((messageId, clientMsgId) => {
        const key = String(clientMsgId || messageId);
        setMessageStatusUpdates(prev => {
            const newMap = new Map(prev);
            newMap.delete(key);
            return newMap;
        });
    }, []);

    useEffect(() => {
        console.log('messageStatusUpdates 更新:', messageStatusUpdates);
    }, [messageStatusUpdates]);

    useEffect(() => {
        // 监听连接状态
        const cleanupConnectionStatus = webSocketAPI.onConnectionStatus(handleConnectionStatus);

        // 监听消息相关事件
        webSocketAPI.onMessage(handleNewMessage);
        webSocketAPI.onMessageSent(handleMessageSent);
        webSocketAPI.onMessageDelivered(handleMessageDelivered);
        webSocketAPI.onMessageRead(handleMessageRead);
        webSocketAPI.onMessageRecalled(handleMessageRecalled);
        webSocketAPI.onTyping(handleTyping);
        webSocketAPI.onNotification(handleNotification);
        // 添加 not_friend 监听
        webSocketAPI.onNotFriend(handleNotFriend);

        // 检查用户是否登录并连接
        const checkAndConnect = () => {
            const token = localStorage.getItem('token');
            if (token) {
                connectWebSocket();
            }
        };

        // 初始连接
        checkAndConnect();

        // 监听登录状态变化
        const handleStorageChange = (e) => {
            if (e.key === 'token') {
                if (e.newValue) {
                    connectWebSocket();
                } else {
                    webSocketAPI.disconnect();
                    setConnectionStatus('disconnected');
                    setUnreadCount(0);
                    setNotifications([]);
                    setMessageStatusUpdates(new Map());
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            webSocketAPI.disconnect();

            // 清理所有事件监听器
            if (cleanupConnectionStatus && typeof cleanupConnectionStatus === 'function') {
                cleanupConnectionStatus();
            }

            webSocketAPI.offMessage(handleNewMessage);
            webSocketAPI.offMessageSent(handleMessageSent);
            webSocketAPI.offMessageDelivered(handleMessageDelivered);
            webSocketAPI.offMessageRead(handleMessageRead);
            webSocketAPI.offMessageRecalled(handleMessageRecalled);
            webSocketAPI.offTyping(handleTyping);
            webSocketAPI.offNotification(handleNotification);
            webSocketAPI.offNotFriend(handleNotFriend);

            window.removeEventListener('storage', handleStorageChange);
        };
    }, [connectWebSocket, handleNewMessage, handleMessageSent, handleMessageDelivered,
        handleMessageRead, handleMessageRecalled, handleTyping, handleNotification,
        handleConnectionStatus, handleNotFriend]);

    const sendMessage = useCallback((messageData) => {
        return webSocketAPI.sendMessage(messageData);
    }, []);

    const sendTypingStatus = useCallback((receiverId, convType, isTyping, text = '') => {
        return webSocketAPI.sendTypingStatus(receiverId, convType, isTyping, text);
    }, []);

    const sendReadReceipt = useCallback((conversationId, messageId) => {
        return webSocketAPI.sendReadReceipt(conversationId, messageId);
    }, []);

    const recallMessage = useCallback((messageId) => {
        return webSocketAPI.recallMessage(messageId);
    }, []);

    const contextValue = {
        connectionStatus,
        unreadCount,
        notifications,
        typingUsers,
        messageStatusUpdates,
        sendMessage,
        sendTypingStatus,
        sendReadReceipt,
        recallMessage,
        getMessageStatusUpdate,
        clearMessageStatusUpdate,
        markNotificationAsRead: useCallback((notificationId) => {
            setNotifications(prev =>
                prev.map(notif =>
                    notif.id === notificationId ? { ...notif, read: true } : notif
                )
            );
        }, []),
        clearNotifications: useCallback(() => {
            setNotifications([]);
        }, []),
        clearUnreadCount: useCallback(() => {
            setUnreadCount(0);
        }, []),
        isTyping: useCallback((userId, conversationId) => {
            const key = `${String(userId)}_${String(conversationId)}`;
            const typingData = typingUsers.get(key);
            return typingData ? typingData.isTyping : false;
        }, [typingUsers]),
        isConnected: () => webSocketAPI.isConnected(),
        reconnect: connectWebSocket,
        onMessage: webSocketAPI.onMessage,
        offMessage: webSocketAPI.offMessage
    };

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
};