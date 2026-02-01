import request from '../utils/request';

export const messageApi = {
    // 发送消息
    sendMessage: (data) => {
        // 确保数据格式正确
        const payload = {
            ...data,
            // 确保ID是字符串
            receiver_id: String(data.receiver_id),
            client_msg_id: data.client_msg_id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        return request.post('/message', payload);
    },

    // 获取消息列表
    listMessages: (conversationId, lastMsgId = "0", limit = 20) => {
        return request.post('/messages/list', {
            conversation_id: String(conversationId),
            last_msg_id: String(lastMsgId),
            limit
        });
    },

    // 撤回消息
    recallMessage: (messageId) => {
        return request.delete(`/message/${String(messageId)}`);
    },

    // 标记消息已读
    markMessagesRead: (conversationId, lastMsgId) => {
        return request.post('/messages/read', {
            conversation_id: String(conversationId),
            last_msg_id: String(lastMsgId)
        });
    },

    // 获取会话列表
    listConversations: (pageStats = { page: 1, page_size: 20 }) => {
        return request.post('/conversations', {
            page_stats: pageStats
        });
    },

    // 删除会话
    deleteConversation: (conversationId) => {
        return request.delete(`/conversation/${String(conversationId)}`);
    },

    // 获取会话详情
    getConversation: (targetId, convType) => {
        return request.post('/conversation/detail', {
            target_id: String(targetId),
            conv_type: convType
        });
    },

    // 获取未读消息数
    getUnreadCount: (targetId = '', convType) => {
        const params = {};
        if (targetId) params.target_id = String(targetId);
        if (convType !== undefined) params.conv_type = convType;

        return request.get('/messages/unread-count', {
            params: params
        });
    },

    // 创建会话
    createConversation: (targetId, convType, initialMessage = '') => {
        return request.post('/conversation', {
            target_id: String(targetId),
            conv_type: convType,
            initial_message: initialMessage
        });
    },

    // 清空聊天记录
    clearMessages: (conversationId) => {
        return request.delete('/messages', {
            params: {
                conversation_id: String(conversationId)
            }
        });
    },

    // 更新消息状态
    updateMessageStatus: (messageId, status) => {
        return request.post('/message/status', {
            message_id: String(messageId),
            status
        });
    }
};