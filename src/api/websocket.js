// websocket.js (API 封装文件)
import { websocketManager } from '../utils/websocket';

export const webSocketAPI = {
    connect: (token) => {
        websocketManager.connect(token);
    },

    disconnect: () => {
        websocketManager.disconnect();
    },

    // 发送消息
    sendMessage: (messageData) => {
        return websocketManager.sendMessage(messageData);
    },

    // 发送输入状态
    sendTypingStatus: (receiverId, convType, isTyping, text = '') => {
        return websocketManager.sendTypingStatus(receiverId, convType, isTyping, text);
    },

    // 发送已读回执
    sendReadReceipt: (conversationId, messageId) => {
        return websocketManager.sendReadReceipt(conversationId, messageId);
    },

    // 撤回消息
    recallMessage: (messageId) => {
        return websocketManager.recallMessage(messageId);
    },

    // 监听新消息
    onMessage: (callback) => {
        websocketManager.on('new_message', callback);
    },

    // 监听消息发送成功
    onMessageSent: (callback) => {
        websocketManager.on('message_sent', callback);
    },

    // 监听消息已送达
    onMessageDelivered: (callback) => {
        websocketManager.on('message_delivered', callback);
    },

    // 监听消息已读
    onMessageRead: (callback) => {
        websocketManager.on('message_read', callback);
    },

    // 监听消息撤回
    onMessageRecalled: (callback) => {
        websocketManager.on('message_recalled', callback);
    },

    // 监听用户正在输入
    onTyping: (callback) => {
        websocketManager.on('user_typing', callback);
    },

    // 监听通知
    onNotification: (callback) => {
        websocketManager.on('notification', callback);
    },

    // 监听认证成功
    onAuthSuccess: (callback) => {
        websocketManager.on('auth_success', callback);
    },

    // 监听连接状态 - 简化版本
    onConnectionStatus: (callback) => {
        websocketManager.on('connection_status', callback);
        websocketManager.on('connection_established', () => callback('connected'));
        websocketManager.on('connection_error', () => callback('error'));

        // 返回清理函数
        return () => {
            websocketManager.off('connection_status', callback);
            websocketManager.off('connection_established', () => callback('connected'));
            websocketManager.off('connection_error', () => callback('error'));
        };
    },

    // 移除监听器方法
    offMessage: (callback) => {
        websocketManager.off('new_message', callback);
    },

    offMessageSent: (callback) => {
        websocketManager.off('message_sent', callback);
    },

    offMessageDelivered: (callback) => {
        websocketManager.off('message_delivered', callback);
    },

    offMessageRead: (callback) => {
        websocketManager.off('message_read', callback);
    },

    offMessageRecalled: (callback) => {
        websocketManager.off('message_recalled', callback);
    },

    offTyping: (callback) => {
        websocketManager.off('user_typing', callback);
    },

    offNotification: (callback) => {
        websocketManager.off('notification', callback);
    },

    offAuthSuccess: (callback) => {
        websocketManager.off('auth_success', callback);
    },

    offConnectionStatus: (callback) => {
        // 简化处理
        websocketManager.off('connection_status', callback);
    },

    // 连接状态检查
    isConnected: () => {
        return websocketManager.isConnected();
    },

    getConnectionStatus: () => {
        return websocketManager.getConnectionStatus();
    }
};