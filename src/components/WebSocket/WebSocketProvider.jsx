// WebSocketProvider.jsx 的修改
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
    const [messageStatusUpdates, setMessageStatusUpdates] = useState(new Map()); // 存储消息状态更新

    const handleNewMessage = useCallback((message) => {
        console.log('收到新消息:', message);

        const user = getCurrentUser();
        if (user && message.sender_id !== user.id) {
            setUnreadCount(prev => prev + 1);
        }

        // 显示通知
        const newNotification = {
            id: Date.now(),
            type: 'message',
            title: '新消息',
            content: `收到来自用户 ${message.sender_id} 的消息`,
            timestamp: Date.now(),
            read: false
        };

        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
    }, []);

    // 处理消息发送成功
    // 处理消息发送成功回执
    const handleMessageSent = useCallback((response) => {
        console.log('收到发送确认:', response);

        // 根据你提供的日志，数据在 response.data 里面
        const info = response.data || {};
        const serverId = info.message_id ? String(info.message_id) : null;
        const clientId = info.client_msg_id || response.client_msg_id;

        setMessageStatusUpdates(prev => {
            const newMap = new Map(prev);
            const updateObj = {
                messageId: serverId,
                status: 1, // SENT
                timestamp: Date.now()
            };

            // 使用 client_msg_id 作为 Key，因为这是 React 初始存的 ID
            if (clientId) newMap.set(String(clientId), updateObj);
            // 同时也存一份以 serverId 为 Key 的，方便后续处理 read_receipt
            if (serverId) newMap.set(serverId, updateObj);

            return newMap;
        });
    }, []);

    // 处理消息已送达
    const handleMessageDelivered = useCallback((data) => {
        console.log('消息已送达:', data);

        // 更新消息状态为已送达 (2)
        setMessageStatusUpdates(prev => {
            const newMap = new Map(prev);
            const key = `${data.message_id}`;

            newMap.set(key, {
                messageId: data.message_id,
                status: 2, // DELIVERED
                receiverId: data.receiver_id,
                timestamp: Date.now()
            });

            return newMap;
        });
    }, []);

    // 处理消息已读
    const handleMessageRead = useCallback((data) => {
        console.log('消息已读:', data);

        // 更新消息状态为已读 (3)
        setMessageStatusUpdates(prev => {
            const newMap = new Map(prev);
            const key = `${data.message_id}`;

            newMap.set(key, {
                messageId: data.message_id,
                status: 3, // READ
                readerId: data.reader_id,
                timestamp: Date.now()
            });

            return newMap;
        });
    }, []);

    // 处理消息撤回
    const handleMessageRecalled = useCallback((data) => {
        console.log('消息已撤回:', data);

        // 更新消息状态为已撤回 (4)
        setMessageStatusUpdates(prev => {
            const newMap = new Map(prev);
            const key = `${data.message_id}`;

            newMap.set(key, {
                messageId: data.message_id,
                status: 4, // RECALLED
                recalledBy: data.recalled_by,
                timestamp: Date.now()
            });

            return newMap;
        });
    }, []);

    const handleTyping = useCallback((data) => {
        const { sender_id, receiver_id, is_typing, text } = data;

        setTypingUsers(prev => {
            const newMap = new Map(prev);
            const key = `${sender_id}_${receiver_id}`;

            if (is_typing) {
                newMap.set(key, {
                    userId: sender_id,
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

    // 获取消息状态更新
    // 获取状态的方法也要强制转 String
    const getMessageStatusUpdate = useCallback((id) => {
        return messageStatusUpdates.get(String(id));
    }, [messageStatusUpdates]);

    // ... 其他 handle 保持一致的 String 转换逻辑 ...

    // 记得在 useEffect 里正确绑定 handleMessageSent
    useEffect(() => {
        webSocketAPI.onMessageSent(handleMessageSent);
        // ...
    }, [handleMessageSent]);

    // 清除消息状态更新
    const clearMessageStatusUpdate = useCallback((messageId, clientMsgId) => {
        const key = clientMsgId || messageId;
        setMessageStatusUpdates(prev => {
            const newMap = new Map(prev);
            newMap.delete(key);
            return newMap;
        });
    }, []);

    useEffect(() => {
        // 监听连接状态
        webSocketAPI.onConnectionStatus((status) => {
            setConnectionStatus(status);
            console.log('WebSocket连接状态:', status);
        });

        // 监听消息相关事件
        webSocketAPI.onMessage(handleNewMessage);
        webSocketAPI.onMessageSent(handleMessageSent);
        webSocketAPI.onMessageDelivered(handleMessageDelivered);
        webSocketAPI.onMessageRead(handleMessageRead);
        webSocketAPI.onMessageRecalled?.(handleMessageRecalled);
        webSocketAPI.onTyping(handleTyping);
        webSocketAPI.onNotification(handleNotification);

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
            webSocketAPI.offMessage(handleNewMessage);
            webSocketAPI.offMessageSent?.(handleMessageSent);
            webSocketAPI.offMessageDelivered?.(handleMessageDelivered);
            webSocketAPI.offMessageRead?.(handleMessageRead);
            webSocketAPI.offTyping?.(handleTyping);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [connectWebSocket, handleNewMessage, handleMessageSent, handleMessageDelivered, handleMessageRead, handleMessageRecalled, handleTyping, handleNotification]);

    const sendMessage = useCallback((messageData) => {
        return webSocketAPI.sendMessage(messageData);
    }, []);

    const sendTypingStatus = useCallback((receiverId, convType, isTyping, text) => {
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
            const key = `${userId}_${conversationId}`;
            const typingData = typingUsers.get(key);
            return typingData ? typingData.isTyping : false;
        }, [typingUsers]),
        isConnected: webSocketAPI.isConnected,
        reconnect: connectWebSocket
    };

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
};