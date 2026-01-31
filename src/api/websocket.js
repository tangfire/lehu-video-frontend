// websocket.js (API 封装文件)
import { websocketManager } from '../utils/websocket';

export const webSocketAPI = {
    connect: (token) => {
        websocketManager.connect(token);
    },

    disconnect: () => {
        websocketManager.disconnect();
    },

    sendMessage: (messageData) => {
        return websocketManager.sendMessage(messageData);
    },

    sendTypingStatus: (receiverId, convType, isTyping, text = '') => {
        return websocketManager.send({
            action: 'typing',
            data: {
                receiver_id: receiverId,
                conv_type: convType,
                is_typing: isTyping,
                text
            },
            timestamp: Date.now()
        });
    },

    sendReadReceipt: (conversationId, messageId) => {
        return websocketManager.send({
            action: 'read_message',
            data: {
                conversation_id: conversationId,
                message_id: messageId
            },
            timestamp: Date.now()
        });
    },

    recallMessage: (messageId) => {
        return websocketManager.send({
            action: 'recall_message',
            data: { message_id: messageId },
            timestamp: Date.now()
        });
    },

    // 事件监听器 - 添加 message_sent 监听
    onMessage: (callback) => {
        websocketManager.on('new_message', callback);
    },

    // 添加 message_sent 监听
    onMessageSent: (callback) => {
        websocketManager.on('message_sent', callback);
    },

    // 添加 message_delivered 监听
    onMessageDelivered: (callback) => {
        websocketManager.on('message_delivered', callback);
    },

    onMessageRead: (callback) => {
        websocketManager.on('message_read', callback);
    },

    onTyping: (callback) => {
        websocketManager.on('user_typing', callback);
    },

    onNotification: (callback) => {
        websocketManager.on('notification', callback);
    },

    onAuthSuccess: (callback) => {
        websocketManager.on('auth_success', callback);
    },

    onConnectionStatus: (callback) => {
        websocketManager.on('connection_established', () => callback('connected'));
        websocketManager.on('connection_lost', () => callback('disconnected'));
        websocketManager.on('connection_error', () => callback('error'));
    },

    // 添加移除监听的方法
    offMessage: (callback) => {
        websocketManager.off('new_message', callback);
    },

    offMessageSent: (callback) => {
        websocketManager.off('message_sent', callback);
    },

    offMessageDelivered: (callback) => {
        websocketManager.off('message_delivered', callback);
    },

    offTyping: (callback) => {
        websocketManager.off('user_typing', callback);
    },

    isConnected: () => {
        return websocketManager.isConnected();
    },

    getConnectionStatus: () => {
        return websocketManager.getConnectionStatus();
    }
};