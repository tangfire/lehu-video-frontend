// api/message.js
import request from '../utils/request';
import { performanceMonitor } from '../utils/performance';

export const messageApi = {
    // 发送消息
    sendMessage: (data) => {
        performanceMonitor.startRequest('/message', 'POST');

        const payload = {
            conversation_id: String(data.conversation_id),
            receiver_id: String(data.receiver_id),
            conv_type: data.conv_type,
            msg_type: data.msg_type,
            content: data.content,
            client_msg_id: data.client_msg_id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        return request.post('/message', payload)
            .finally(() => performanceMonitor.endRequest('/message', 'POST'));
    },

    // 获取会话详情
    getConversationDetail: (conversationId) => {
        performanceMonitor.startRequest(`/conversation/${conversationId}`, 'GET');

        return request.get(`/conversation/${String(conversationId)}`)
            .finally(() => performanceMonitor.endRequest(`/conversation/${conversationId}`, 'GET'));
    },

    // 获取消息列表
    listMessages: (conversationId, lastMsgId = "0", limit = 20) => {
        performanceMonitor.startRequest('/messages/list', 'POST');

        return request.post('/messages/list', {
            conversation_id: String(conversationId),
            last_msg_id: String(lastMsgId),
            limit
        }).finally(() => performanceMonitor.endRequest('/messages/list', 'POST'));
    },

    // 撤回消息
    recallMessage: (messageId) => {
        performanceMonitor.startRequest(`/message/${messageId}`, 'DELETE');

        return request.delete(`/message/${String(messageId)}`)
            .finally(() => performanceMonitor.endRequest(`/message/${messageId}`, 'DELETE'));
    },

    // 标记消息已读
    markMessagesRead: (conversationId, lastMsgId) => {
        performanceMonitor.startRequest('/messages/read', 'POST');

        return request.post('/messages/read', {
            conversation_id: String(conversationId),
            last_msg_id: String(lastMsgId)
        }).finally(() => performanceMonitor.endRequest('/messages/read', 'POST'));
    },

    // 获取会话列表
    listConversations: (pageStats = { page: 1, page_size: 20 }) => {
        performanceMonitor.startRequest('/conversations', 'POST');

        return request.post('/conversations', {
            page_stats: pageStats
        }).finally(() => performanceMonitor.endRequest('/conversations', 'POST'));
    },

    // 删除会话
    deleteConversation: (conversationId) => {
        performanceMonitor.startRequest(`/conversation/${conversationId}`, 'DELETE');

        return request.delete(`/conversation/${String(conversationId)}`)
            .finally(() => performanceMonitor.endRequest(`/conversation/${conversationId}`, 'DELETE'));
    },

    // 清空聊天记录
    clearMessages: (conversationId) => {
        performanceMonitor.startRequest('/messages', 'DELETE');

        return request.delete('/messages', {
            params: {
                conversation_id: String(conversationId)
            }
        }).finally(() => performanceMonitor.endRequest('/messages', 'DELETE'));
    },

    // 获取未读消息数
    getUnreadCount: (conversationId = '', convType) => {
        performanceMonitor.startRequest('/messages/unread-count', 'GET');

        const params = {};
        if (conversationId) params.conversation_id = String(conversationId);
        if (convType !== undefined) params.conv_type = convType;

        return request.get('/messages/unread-count', {
            params: params
        }).finally(() => performanceMonitor.endRequest('/messages/unread-count', 'GET'));
    },

    // 创建会话
    createConversation: (targetId, convType, initialMessage = '') => {
        performanceMonitor.startRequest('/conversation', 'POST');

        return request.post('/conversation', {
            target_id: String(targetId),
            conv_type: convType,
            initial_message: initialMessage
        }).finally(() => performanceMonitor.endRequest('/conversation', 'POST'));
    },

    // 更新消息状态
    updateMessageStatus: (messageId, status) => {
        performanceMonitor.startRequest('/message/status', 'POST');

        return request.post('/message/status', {
            message_id: String(messageId),
            status
        }).finally(() => performanceMonitor.endRequest('/message/status', 'POST'));
    }
};